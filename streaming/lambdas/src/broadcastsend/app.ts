import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event, context) => {
  const manApi = new ApiGatewayManagementApiClient({
    endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    region: process.env.AWS_REGION,
  });
  
  const connectionId = event.requestContext.connectionId

  const connKeyCond = {
    pk: { S: `connection#${connectionId}` } 
  }
  
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "body is required"
      })
    }
  }
  const postData = JSON.parse(event.body).data;

  const command = new GetItemCommand({
    TableName: process.env.STREAM_TABLE,
    Key: connKeyCond
  })
  
  try {
    const item = await ddbClient.send(command)
    if (!item.Item) {
      throw Error('No connection found')
    }
    const connType = item.Item.connectionType
    if (connType.S !== 'broadcast') {
      throw Error('Connection is not a broadcast connection')
    }
    const relayCommand = new PostToConnectionCommand({
      ConnectionId: postData.viewerId,
      // @ts-ignore
      Data: JSON.stringify({
        payload: postData.data,
        message_type: 'broadcast_message',
      })
    })
    await manApi.send(relayCommand)
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Message sent"
      })
    }

  } catch (err) {
    console.log(err)
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error sending message"
      })
    }
  }
}

import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION })

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event, context) => {
  console.log("got message", event);
  const manApi = new ApiGatewayManagementApiClient({
    region: process.env.AWS_REGION,
    endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
  })
  
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
    if (connType.S !== 'viewer') {
      throw Error('Connection is not a viewer')
    }

    const relayCommand = new PostToConnectionCommand({
      ConnectionId: item.Item?.broadcastConnectionId.S,
      // @ts-ignore
      Data: JSON.stringify({
        payload: postData.data,
        message_type: 'viewer_message',
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
        message: "Failed to send message"
      })
    }
  }
}

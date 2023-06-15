import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand} from "@aws-sdk/client-dynamodb"
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });


export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event, context) => {
  const manApi = new ApiGatewayManagementApiClient({
    region: process.env.AWS_REGION,
    endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
  })

  const connectionId  = event.requestContext.connectionId
  if (!connectionId || !event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "connectionId and body are required"
      })
    }
  }
  const broadcastId = JSON.parse(event.body).data.broadcastId
  
  if (!broadcastId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "broadcastId is required"
      })
    }
  }

  const getBroadcastCommand = new GetItemCommand({
    TableName: process.env.STREAM_TABLE,
    Key: {
      pk: {
        S: `broadcast#${broadcastId}`
      }
    }
  })
  try {
    const output = await ddbClient.send(getBroadcastCommand)
    const brConnId = output.Item?.connectionId
    if (!brConnId || !brConnId.S) {
      throw Error('No broadcast connection found')
    }
    const updateCommand = new UpdateItemCommand({
      TableName: process.env.STREAM_TABLE,
      Key: {
        pk: {
          S: `connection#${connectionId}`
        }
      },
      ExpressionAttributeNames: {
        "#C": "connectionType",
        "#B": "broadcastConnectionId"
      },
      ExpressionAttributeValues: {
        ":c": { S: "viewer" },
        ":b": { S: brConnId.S }
      },
      UpdateExpression: "SET #C = :c, #B = :b"
    })
    await ddbClient.send(updateCommand)

    const responseCommand = new PostToConnectionCommand({
      ConnectionId: connectionId,
      // @ts-ignore
      Data: JSON.stringify({
        success: true,
        message_type: 'session_created',
        payload: connectionId
      })
    })

    await manApi.send(responseCommand)

    return {
      statusCode: 200,
      body: 'Viewer initialized.'
    }
  } catch (err) {
    console.log(err)
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error initializing viewer"
      })
    }
  }
}

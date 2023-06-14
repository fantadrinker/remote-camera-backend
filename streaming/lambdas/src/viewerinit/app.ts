import AWS from 'aws-sdk'
import { DynamoDBClient, GetItemCommand, UpdateItemCommand} from "@aws-sdk/client-dynamodb"
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });


export const initViewer : APIGatewayProxyWebsocketHandlerV2 = async (event, context) => {
  const manApi = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: event.requestContext.domainName + "/" + event.requestContext.stage
  });

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
    await manApi.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify({

        success: true,
        message_type: 'session_created',
        payload: connectionId,
      })
    }).promise()
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

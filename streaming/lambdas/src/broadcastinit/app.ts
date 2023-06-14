import AWS from "aws-sdk";
import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { DynamoDBClient, PutItemCommand, UpdateItemCommand} from "@aws-sdk/client-dynamodb"

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const initBroadcast: APIGatewayProxyWebsocketHandlerV2 = async (event, context) => {
  const manApi = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: event.requestContext.domainName + "/" + event.requestContext.stage
  });

  const connId = event.requestContext.connectionId;
  if (!connId || !event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "connectionId and body are required"
      })
    }
  }
  const broadcastId = JSON.parse(event.body).data.broadcastId;
  if (!broadcastId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "broadcastId is required"
      })
    }
  }

  // pk: "broadcast#"+broadcastId, connectionId: connId
  const createBrCommand = new PutItemCommand({
    TableName: process.env.STREAM_TABLE,
    Item: {
      pk: {
        S: `broadcast#${broadcastId}`,
      },
      connectionId: {
        S: connId,
      }
    }
  })
  const updateConnCommand = new UpdateItemCommand({
    TableName: process.env.STREAM_TABLE,
    Key: {
      pk: {
        S: `connection#${connId}`
      }
    },
    ExpressionAttributeNames: {
      "#C": "connectionType"
    },
    ExpressionAttributeValues: {
      ":c": { S: "broadcast" }
    },
    UpdateExpression: "SET #C = :c"
  })

  try {
    await ddbClient.send(createBrCommand);
    await ddbClient.send(updateConnCommand);
    await manApi.postToConnection({
      ConnectionId: connId,
      Data: JSON.stringify({
        success: true
      })
    }).promise()
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Broadcast connection initialized"
      })
    }
  } catch (err) {
    console.log(err)
    return {
      statusCode: 500,
      body: JSON.stringify({
        message:  "Failed to initialize broadcast connection"
      })
    }
  }

}

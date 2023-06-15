/**
 * Creates a row in dynamodb stream table (get from env variable)
 * If it's viewer, find the broadcast, and create a 1-on-1 session
 * If it's broadcaster connecting, create a broadcast row
 */
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION })

export const handler: APIGatewayProxyWebsocketHandlerV2 = (event, context) => {
  console.log('event', event);
  

  const connectionId = event.requestContext.connectionId

  const command = new PutItemCommand({
    TableName: process.env.STREAM_TABLE,
    Item: {
      pk: 
      { 
        S: `connection#${connectionId}`
      },
      connectionId: {
        S: connectionId,
      },
    }
  })

  return ddbClient.send(command).then(() => {
    return { statusCode: 200, body: 'Connected' }
  }).catch((error) => {
    console.log("connection failed.", error)
    return { statusCode: 500, body: 'Failed to connect' }
  })
};


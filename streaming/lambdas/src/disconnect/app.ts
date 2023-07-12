/**
 * Deletes the corresponding session and/or broadcast depending on if it's viewer or broadcaster.
 */
import { DeleteItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
})

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event, context) => {

  const connectionId = event.requestContext.connectionId

  const command = new DeleteItemCommand({
    TableName: process.env.STREAM_TABLE,
    Key: {
      pk: {
        S: `connection#${connectionId}`
      }
    }
  })
  try {
    await ddbClient.send(command)
  } catch (error) {
    console.log("error cleaning up", event, error)
  }
  return { statusCode: 200, body: "Disconnected." }
} 

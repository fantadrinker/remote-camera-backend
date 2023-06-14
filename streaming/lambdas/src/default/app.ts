import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";


export const handler: APIGatewayProxyWebsocketHandlerV2 = (event) => {
  console.log('default handler', event);
}

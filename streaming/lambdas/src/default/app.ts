import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";


export const onMessage : APIGatewayProxyWebsocketHandlerV2 = (event) => {
  console.log('default handler', event);
}

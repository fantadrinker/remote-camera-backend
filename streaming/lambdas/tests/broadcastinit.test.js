const broadcastinit = require('../src/broadcastinit/app');
const awsSdk = require('aws-sdk-client-mock');
require('aws-sdk-client-mock-jest');
const ddbClient = require('@aws-sdk/client-dynamodb');
const apiManClient = require('@aws-sdk/client-apigatewaymanagementapi');

const ddbMock = awsSdk.mockClient(ddbClient.DynamoDBClient);
const apiManMock = awsSdk.mockClient(apiManClient.ApiGatewayManagementApiClient)

describe('broadcastinit handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    apiManMock.reset();
    process.env.STREAM_TABLE = 'STREAM_TABLE';
  })

  it('should return 400 if body or connectionId is missing', async () => {
    const event = {
      requestContext: {
        connectionId: '12345',
      }
    }
    const response = await broadcastinit.handler(event);
    expect(response.statusCode).toEqual(400);
  })

  it('should return 200 for valid request with good body format', async () => {
    const event = {
      requestContext: {
        connectionId: '12345',
      },
      body: JSON.stringify({
        data: {
          broadcastId: '12345',
        }
      })
    }
    const putBroadcastCommand = {
      TableName: 'STREAM_TABLE',
      Item: {
        pk: {
          S: `broadcast#12345`,
        },
        connectionId: {
          S: '12345',
        }
      }
    }
    const updateConnectionCommand = {
      TableName: 'STREAM_TABLE',
      Key: {
        pk: {
          S: `connection#12345`
        }
      },
      ExpressionAttributeNames: {
        "#C": "connectionType"
      },
      ExpressionAttributeValues: {
        ":c": { S: "broadcast" }
      },
      UpdateExpression: "SET #C = :c"
    }
    const wsResponse = {
      ConnectionId: '12345',
      Data: JSON.stringify({
        success: true,
      })
    }

    ddbMock
      .on(ddbClient.PutItemCommand)
      .rejects({})
      .on(ddbClient.UpdateItemCommand)
      .rejects({})
      .on(ddbClient.PutItemCommand, putBroadcastCommand)
      .resolves({})
      .on(ddbClient.UpdateItemCommand, updateConnectionCommand)
      .resolves({});

    apiManMock
      .on(apiManClient.PostToConnectionCommand)
      .rejects({})
      .on(apiManClient.PostToConnectionCommand, wsResponse)
      .resolves({});

    const response = await broadcastinit.handler(event);
    expect(response.statusCode).toEqual(200);

    expect(ddbMock).toHaveReceivedCommandWith(
      ddbClient.PutItemCommand,
      putBroadcastCommand
    );
    expect(ddbMock).toHaveReceivedCommandWith(
      ddbClient.UpdateItemCommand,
      updateConnectionCommand
    );
    expect(apiManMock).toHaveReceivedCommandWith(
      apiManClient.PostToConnectionCommand,
      wsResponse
    );
  })
})


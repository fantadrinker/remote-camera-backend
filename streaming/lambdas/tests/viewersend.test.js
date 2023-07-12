const viewersend = require('../src/viewersend/app');
const awsSdk = require('aws-sdk-client-mock');
require('aws-sdk-client-mock-jest');

const ddbClient = require('@aws-sdk/client-dynamodb');
const apiManClient = require('@aws-sdk/client-apigatewaymanagementapi');

const ddbMock = awsSdk.mockClient(ddbClient.DynamoDBClient);
const apiManMock = awsSdk.mockClient(apiManClient.ApiGatewayManagementApiClient)

describe('viewersend', () => {
  beforeEach(() => {
    ddbMock.reset();
    apiManMock.reset();
    process.env.STREAM_TABLE = 'streams_table';
  })

  test('should relay message to peer', async () => {
    const event = {
      requestContext: {
        connectionId: 'testConnId'
      },
      body: JSON.stringify({
        data: {
          data: 'testMessage',
          broadcastId: 'testBroadcastId',
        }
      })
    };

    ddbMock
      .on(ddbClient.GetItemCommand, {
        TableName: 'streams_table',
        Key: { pk: { S: 'connection#testConnId' } }
      })
      .resolves({
        Item: {
          connectionType: { S: 'viewer' },
          broadcastConnectionId: { S: 'testBroadcastConnId' },
        },
      });

    apiManMock
      .on(apiManClient.PostToConnectionCommand)
      .resolves({});

    const result = await viewersend.handler(event);

    expect(result.statusCode).toEqual(200);

    expect(apiManMock).toHaveReceivedCommandWith(apiManClient.PostToConnectionCommand, {
      ConnectionId: 'testBroadcastConnId',
      Data: JSON.stringify({
        payload: 'testMessage',
        message_type: 'viewer_message',
      })
    });
  });
});

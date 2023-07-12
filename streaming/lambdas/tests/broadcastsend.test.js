const bcsend = require('../src/broadcastsend/app');
const awsSdk = require('aws-sdk-client-mock');
require('aws-sdk-client-mock-jest');
const ddbClient = require('@aws-sdk/client-dynamodb');
const apiManClient = require('@aws-sdk/client-apigatewaymanagementapi');

const mockDdb = awsSdk.mockClient(ddbClient.DynamoDBClient);
const mockApiMan = awsSdk.mockClient(apiManClient.ApiGatewayManagementApiClient);

describe('broadcastsend', () => {
  beforeEach(() => {
    mockDdb.reset();
    mockApiMan.reset();
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
          viewerId: 'testViewerId',
        }
      })
    };

    mockDdb
      .on(ddbClient.GetItemCommand)
      .rejects({})
      .on(ddbClient.GetItemCommand, {
        TableName: 'streams_table',
        Key: { pk: { S: 'connection#testConnId' } }
      })
      .resolves({
        Item: {
          connectionType: { S: 'broadcast' },
        },
      });

    mockApiMan
      .on(apiManClient.PostToConnectionCommand)
      .rejects({})
      .on(apiManClient.PostToConnectionCommand, {
        ConnectionId: 'testViewerId',
        Data: JSON.stringify({ payload: 'testMessage', message_type: 'broadcast_message' })
      })
      .resolves({});

    const result = await bcsend.handler(event);
    expect(result.statusCode).toEqual(200);
  })

  test('should return a 400 if connection id or body is missing', async () => {
    const event = {
      requestContext: {
        connectionId: 'testConnId'
      },
    }
    mockDdb
      .on(ddbClient.GetItemCommand)
      .resolves({
        Item: {
          connectionType: { S: 'broadcast' },
        },
      });
    mockApiMan
      .on(apiManClient.PostToConnectionCommand)
      .resolves({});

    const result = await bcsend.handler(event);
    expect(result.statusCode).toEqual(400);
  })
})


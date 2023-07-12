
const viewerinit = require('../src/viewerinit/app');
const awsSdk = require('aws-sdk-client-mock');
require('aws-sdk-client-mock-jest');
const ddbClient = require('@aws-sdk/client-dynamodb');
const apiManClient = require('@aws-sdk/client-apigatewaymanagementapi');

const ddbMock = awsSdk.mockClient(ddbClient.DynamoDBClient);
const apiManMock = awsSdk.mockClient(apiManClient.ApiGatewayManagementApiClient)

describe('viewerinit', () => {
  beforeEach(() => {
    ddbMock.reset();
    apiManMock.reset();
    process.env.STREAM_TABLE = 'streams_table';
  })

  test('should return a 200 if user includes stream conn id', async () => {
    const event = {
      requestContext: {
        connectionId: 'testConnId'
      },
      body: JSON.stringify({
        data: {
          broadcastId: 'broadcastConnId',
        }
      })
    };

    ddbMock
      .on(ddbClient.GetItemCommand)
      .resolves({})
      .on(ddbClient.GetItemCommand, {
        TableName: 'streams_table',
        Key: { pk: { S: 'broadcast#broadcastConnId' } }
      })
      .resolves({
        Item: {
          connectionType: { S: 'broadcast' },
          connectionId: { S: 'brConnId' },
        },
      })
      .on(ddbClient.UpdateItemCommand)
      .resolves({});

    apiManMock
      .on(apiManClient.PostToConnectionCommand)
      .resolves({});

    const result = await viewerinit.handler(event);
    expect(result.statusCode).toEqual(200);

    expect(ddbMock).toHaveReceivedCommandWith(ddbClient.UpdateItemCommand, {
      TableName: 'streams_table',
      Key: { pk: { S: 'connection#testConnId' } },
      ExpressionAttributeNames: {
        "#C": "connectionType",
        "#B": "broadcastConnectionId"
      },
      ExpressionAttributeValues: {
        ":c": { S: "viewer" },
        ":b": { S: 'brConnId' }
      },
      UpdateExpression: "SET #C = :c, #B = :b"
    })
  })
})

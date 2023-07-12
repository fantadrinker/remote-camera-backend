const disconnect = require('../src/disconnect/app');
const awsSdk = require('aws-sdk-client-mock');
const ddbClient = require('@aws-sdk/client-dynamodb');

const ddbMock = awsSdk.mockClient(ddbClient.DynamoDBClient);

describe('disconnect handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.STREAM_TABLE = 'STREAM_TABLE';
  });

  it('should return 200', async () => {
    const event = {
      requestContext: {
        connectionId: '12345',
      }
    };

    ddbMock.on(ddbClient.DeleteItemCommand, {
      TableName: 'STREAM_TABLE',
      Key: {
        pk: {
          S: `connection#12345`
        }
      }
    }).resolves({});
    const result = await disconnect.handler(event);
    expect(result.statusCode).toEqual(200);
  });

  it('should return 200 if dynamodb fails', async () => {
    const event = {
      requestContext: {
        connectionId: '12345',
      }
    };

    ddbMock.on(ddbClient.DeleteItemCommand).rejects({});
    const result = await disconnect.handler(event);
    expect(result.statusCode).toEqual(200);
  });
});


const connect = require('../src/connect/app');

const awsSdk = require('aws-sdk-client-mock');
const ddbClient = require('@aws-sdk/client-dynamodb');

const ddbMock = awsSdk.mockClient(ddbClient.DynamoDBClient);

describe('connect handler', () => {
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
    const putConnection = {
      TableName: 'STREAM_TABLE',
      Item: {
        pk:
        {
          S: `connection#12345`
        },
        connectionId: {
          S: '12345',
        },
      }
    }
    ddbMock
      .on(ddbClient.PutItemCommand)
      .rejects({})
      .on(ddbClient.PutItemCommand, putConnection)
      .resolves({});
    const result = await connect.handler(event);
    expect(result.statusCode).toEqual(200);
  });

  it('should return 500 if dynamodb fails', async () => {
    const event = {
      requestContext: {
        connectionId: '12345',
      }
    };

    ddbMock.on(ddbClient.PutItemCommand).rejects({});
    const result = await connect.handler(event);
    expect(result.statusCode).toEqual(500);
  });
});

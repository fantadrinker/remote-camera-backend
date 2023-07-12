const connect = require('../src/connect/app');

test('connect handler', () => {
  expect(connect.handler).toBeDefined();
});

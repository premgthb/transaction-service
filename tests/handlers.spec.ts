import { APIGatewayProxyEvent } from "aws-lambda";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { v4 } from "uuid";
import { getTransactions, createTransaction, updateTransaction } from "../src/handlers";

const isTest = process.env.JEST_WORKER_ID;

const config = {
  convertEmptyValues: true,
  ...(isTest && {
    endpoint: "localhost:8000",
    sslEnabled: false,
    region: "local-env",
  }),
};

const ddb = new DocumentClient(config);

const now_ISO_string = new Date(Date.now()).toISOString();

describe("Create Transaction", () => {
  it("returns 200", async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({ currency: "MYR", amount: 9.99 }),
      path: "/transaction",
    };

    const response = await createTransaction(event as APIGatewayProxyEvent);

    expect(response.statusCode).toBe(200);
  });

  it("returns 422", async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({ currency: "MY", amount: "abc" }),
      path: "/transaction",
    };

    const response = await createTransaction(event as APIGatewayProxyEvent);

    expect(response.statusCode).toBe(422);
  });
});

describe("Get Transactions", () => {
  it("returns 200", async () => {
    await ddb
      .put({
        TableName: "transactions",
        Item: { id: v4(), currency: "USD", amount: "8.99", paid: 0, created_at: now_ISO_string },
      })
      .promise();

    const event: Partial<APIGatewayProxyEvent> = { path: "/transactions" };

    const response = await getTransactions(event as APIGatewayProxyEvent);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).length).toBe(2);
  });
});

describe("Update Transaction", () => {
  it("returns 200", async () => {
    const uuid = v4();

    await ddb
      .put({
        TableName: "transactions",
        Item: { id: uuid, currency: "USD", amount: "8.99", paid: 0, created_at: now_ISO_string },
      })
      .promise();

    const event: Partial<APIGatewayProxyEvent> = { pathParameters: { id: uuid } };

    const response = await updateTransaction(event as APIGatewayProxyEvent);

    const updatedTransaction = await ddb
      .get({
        TableName: "transactions",
        Key: { id: uuid },
      })
      .promise();

    expect(response.statusCode).toBe(200);
    expect(updatedTransaction.Item?.paid).toBe(1);
  });

  it("returns 404", async () => {
    const uuid = v4();

    const event: Partial<APIGatewayProxyEvent> = { pathParameters: { id: uuid } };

    const response = await updateTransaction(event as APIGatewayProxyEvent);

    expect(response.statusCode).toBe(404);
  });
});

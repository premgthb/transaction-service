import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import AWS from "aws-sdk";
import { v4 } from "uuid";
import * as yup from "yup";

let options = {};
if (process.env.JEST_WORKER_ID) {
  options = {
    endpoint: "http://localhost:8000",
    region: "local-env",
    sslEnabled: false,
  };
}

// establish DB connections here
const docClient = new AWS.DynamoDB.DocumentClient(options);

export const createTransaction = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestBody = JSON.parse(event.body as string);
  try {
    await Transaction.validate(requestBody, { abortEarly: false });
  } catch (e) {
    if (e instanceof yup.ValidationError) {
      return {
        statusCode: 422,
        body: JSON.stringify({
          errors: e.errors,
        }),
      };
    }
  }

  const { currency, amount } = requestBody;
  const uuid = v4();

  const transaction = {
    id: uuid,
    currency: currency,
    amount: amount,
    paid: 0,
    createdAt: new Date(Date.now()).toISOString(),
  };

  await docClient
    .put({
      TableName: "transactions",
      Item: transaction,
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify(transaction),
  };
};

export const getTransactions = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { Items } = await docClient
    .scan({
      TableName: "transactions",
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify(Items),
  };
};

export const updateTransaction = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;

  const { Item: transaction } = await docClient
    .get({
      TableName: "transactions",
      Key: {
        id: id,
      },
    })
    .promise();

  if (!transaction) {
    return {
      statusCode: 404,
      body: "Transaction not found.",
    };
  }

  const transactionUpdate = {
    ...transaction,
    paid: 1,
  };

  await docClient
    .put({
      TableName: "transactions",
      Item: transactionUpdate,
    })
    .promise();

  return {
    statusCode: 200,
    body: `Transaction ${id} has been marked as paid.`,
  };
};

const Transaction = yup.object({
  currency: yup.string().length(3).uppercase(),
  amount: yup.number().positive(),
});

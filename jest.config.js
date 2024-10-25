/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  verbose: true,
  preset: "@shelf/jest-dynamodb",
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
};

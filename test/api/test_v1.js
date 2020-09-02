//@format
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, `../../.env`) });
const test = require("ava").serial;
const supertest = require("supertest");
const { unlinkSync } = require("fs");

const app = require("../../src/server.js");
const { init } = require(`../../src/controllers/db.js`);

const { DB_PATH, SQLITE_SCHEMA_PATH, BEARER_TOKEN } = process.env;
const sqlConfig = {
  path: path.resolve(__dirname, `../../${DB_PATH}`),
  schema: path.resolve(__dirname, `../../${SQLITE_SCHEMA_PATH}`),
  options: {
    verbose: console.info
  }
};

const teardown = () => {
  unlinkSync(sqlConfig.path);
};

test("if server responds with error if body is malformed", async t => {
  const req = await supertest(app)
    .post("/api/v1/sms")
    .set({ Authorization: `Bearer ${BEARER_TOKEN}` });
  t.assert(req.status === 400);
});

test("if server responds with id", async t => {
  init();

  const expected = {
    receiver: "49152901820",
    text: "test"
  };
  const req = await supertest(app)
    .post("/api/v1/sms")
    .set({ Authorization: `Bearer ${BEARER_TOKEN}` })
    .send(expected);
  t.assert(req.status === 202);
  t.assert(req.body.status === "SCHEDULED");
  t.assert(req.body.id);

  t.teardown(teardown);
});

test("if server rejects invalid values", async t => {
  const expected = {
    receiver: "+9999999",
    text: "😋"
  };
  const req = await supertest(app)
    .post("/api/v1/sms")
    .set({ Authorization: `Bearer ${BEARER_TOKEN}` })
    .send(expected);
  t.assert(req.status === 400);
  t.assert(req.body.errors.length === 2);
});

test("if server rejects request that is not authorized", async t => {
  const req = await supertest(app)
    .post("/api/v1/sms")
    .send({ hello: "world" });
  t.assert(req.status === 401);
});

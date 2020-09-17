//@format
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, `../../.env`) });
const test = require("ava").serial;
const supertest = require("supertest");
const { unlinkSync } = require("fs");

const app = require("../../src/server.js");
const { init, incoming } = require(`../../src/controllers/db.js`);

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
    .post("/api/v1/outgoing")
    .set({ Authorization: `Bearer ${BEARER_TOKEN}` });
  t.assert(req.status === 400);
});

test("if server responds with id", async t => {
  init();

  const expected = {
    receiver: "+491795345170",
    text: "test"
  };
  const req = await supertest(app)
    .post("/api/v1/outgoing")
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
    .post("/api/v1/outgoing")
    .set({ Authorization: `Bearer ${BEARER_TOKEN}` })
    .send(expected);
  t.assert(req.status === 400);
  t.assert(req.error);
});

test("if server rejects request that is not authorized", async t => {
  const req = await supertest(app)
    .post("/api/v1/outgoing")
    .send({ hello: "world" });
  t.assert(req.status === 401);
});

test("if server returns incoming sms filtered by sender", async t => {
  init();
  const expected = {
    id: "abc",
    sender: "1234",
    message: "hello",
    dateTimeSent: new Date()
  };
  incoming.store(expected);
  const req = await supertest(app)
    .get(`/api/v1/incoming?sender=${expected.sender}`)
    .set({ Authorization: `Bearer ${BEARER_TOKEN}` })
    .send();
  t.assert(req.statusCode === 400);
  t.teardown(teardown);
});

test("if server sends filtered result for received messages", async t => {
  init();
  const expected = {
    id: "abc",
    sender: "+491795345170",
    message: "hello",
    dateTimeSent: new Date()
  };
  const unexpected = {
    id: "cba",
    sender: "+491601300531",
    message: "hello",
    dateTimeSent: new Date()
  };
  incoming.store(expected);
  incoming.store(unexpected);
  const req = await supertest(app)
    .get(`/api/v1/incoming?sender=${encodeURIComponent(expected.sender)}`)
    .set({ Authorization: `Bearer ${BEARER_TOKEN}` })
    .send();
  t.assert(req.statusCode === 200);
  t.assert(expected.id === req.body[0].id);
  t.assert(expected.message === req.body[0].text);
  t.assert(expected.sender === req.body[0].sender);
  t.assert(expected.dateTimeSent === req.body[0].dateTimeSent);
  t.assert(req.body[0].dateTimeCreated);
  t.teardown(teardown);
});

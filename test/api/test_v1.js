//@format

const test = require("ava");
const supertest = require("supertest");

const app = require("../../src/server.js");

test("if server responds with error if body is malformed", async t => {
  const req = await supertest(app).post("/api/v1/sms");
  t.assert(req.status === 400);
});

test("if server responds with id", async t => {
  const expected = {
    receiver: "49152901820",
    text: "test"
  };
  const req = await supertest(app)
    .post("/api/v1/sms")
    .send(expected);
  t.assert(req.status === 202);
  t.assert(req.body.status === "SCHEDULED");
  t.assert(req.body.id);
});

test("if server rejects invalid values", async t => {
  const expected = {
    receiver: "+9999999",
    text: "😋"
  };
  const req = await supertest(app)
    .post("/api/v1/sms")
    .send(expected);
  t.assert(req.status === 400);
  t.assert(req.body.errors.length === 2);
});

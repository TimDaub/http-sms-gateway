//@format

const test = require("ava");
const supertest = require("supertest");

const app = require("../../src/server.js");

test("if server responds", async t => {
  const body = (await supertest(app).get("/api/v1")).body;
  t.assert(body.hello === "world");
});

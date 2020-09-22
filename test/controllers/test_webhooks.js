const path = require("path");
const src = "../../src";
require("dotenv").config({ path: path.resolve(src, `.env`) });
const test = require("ava").serial;
const { unlinkSync } = require("fs");
const sqlite = require("better-sqlite3");

const WebhookHandler = require(`${src}/controllers/webhooks.js`);
const {
  init,
  webhooks,
} = require(`${src}/controllers/db.js`);

const { DB_PATH, SQLITE_SCHEMA_PATH } = process.env;
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

test("if add event creates an event for each webhook", t => {
  init();
  const hooks = [{
    id: "abc",
    url: "http://example.com",
    secret: "aaaaaaaaaa",
    event: "incomingMessage"
  }, {
    id: "cba",
    url: "http://example.com",
    secret: "aaaaaaaaaa",
    event: "something else"
  }, {
    id: "def",
    url: "http://example.com",
    secret: "aaaaaaaaaa",
    event: "incomingMessage"
  }];
  hooks.forEach(webhooks.store);

  const whHandler = new WebhookHandler();
  whHandler.addEvent("incomingMessage", {hello: "world"});

  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const res = db.prepare("SELECT * FROM events").all();
  t.assert(res.length == 2);
  t.assert(res[0].webhookId === hooks[0].id);
  t.assert(res[1].webhookId === hooks[2].id);

  t.teardown(teardown);
});

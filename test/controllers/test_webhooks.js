const path = require("path");
const src = "../../src";
require("dotenv").config({ path: path.resolve(src, `.env`) });
const test = require("ava").serial;
const { unlinkSync } = require("fs");
const sqlite = require("better-sqlite3");
const createWorker = require("expressively-mocked-fetch");

const WebhookHandler = require(`${src}/controllers/webhooks.js`);
const { init, webhooks, events } = require(`${src}/controllers/db.js`);

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
  const hooks = [
    {
      id: "abc",
      url: "http://example.com",
      secret: "aaaaaaaaaa",
      event: "incomingMessage"
    },
    {
      id: "cba",
      url: "http://example.com",
      secret: "aaaaaaaaaa",
      event: "something else"
    },
    {
      id: "def",
      url: "http://example.com",
      secret: "aaaaaaaaaa",
      event: "incomingMessage"
    }
  ];
  hooks.forEach(webhooks.store);

  const whHandler = new WebhookHandler();
  whHandler.addEvent("incomingMessage", { hello: "world" });

  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const res = db.prepare("SELECT * FROM events").all();
  t.assert(res.length == 2);
  t.assert(res[0].webhookId === hooks[0].id);
  t.assert(res[1].webhookId === hooks[2].id);

  t.teardown(teardown);
});

test("if webhooks are properly authorized", async t => {
  init();
  const wh = {
    id: "abc",
    url: "http://example.com",
    secret: "aaaaaaaaaa",
    event: "incomingMessage"
  };
  webhooks.store(wh);
  const expected = {
    id: "abc",
    name: "incomingMessage",
    message: '{"hello":"world"}',
    trys: 0,
    lastTry: new Date().toISOString(),
    webhookId: wh.id
  };
  events.store(expected);
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const dbEvt = db
    .prepare(`SELECT * FROM events WHERE id = ?`)
    .get(expected.id);
  t.assert(dbEvt);

  const worker = await createWorker(`
		const crypto = require("crypto");	

		app.post("/", function(req, res) {
      const sig = crypto
        .createHmac("sha256", "${wh.secret}")
        .update(JSON.stringify(req.body))
        .digest("hex");
			if (sig === req.get("X-SMS-GATEWAY-Signature")) {
				res.status(200).send();
			} else {
				res.status(401).send();
			}
		});
	`);
  const url = `http://localhost:${worker.port}`;
  const whHandler = new WebhookHandler();
  await whHandler.send({
    ...expected,
    url,
    secret: wh.secret,
    event: wh.event
  });

  const deletedEvt = db
    .prepare(`SELECT * FROM events WHERE id = ?`)
    .get(expected.id);
  t.assert(!deletedEvt);

  t.teardown(teardown);
});

test("if trys are updated on unsuccessful webhook delivery", async t => {
  init();
  const wh = {
    id: "abc",
    url: "http://example.com",
    secret: "aaaaaaaaaa",
    event: "incomingMessage"
  };
  webhooks.store(wh);
  const expected = {
    id: "abc",
    name: "incomingMessage",
    message: '{"hello":"world"}',
    trys: 0,
    lastTry: new Date().toISOString(),
    webhookId: wh.id
  };
  events.store(expected);
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const dbEvt = db
    .prepare(`SELECT * FROM events WHERE id = ?`)
    .get(expected.id);
  t.assert(dbEvt);

  const worker = await createWorker(`
		app.post("/", function(req, res) {
      res.status(500).send();
		});
	`);
  const url = `http://localhost:${worker.port}`;
  const whHandler = new WebhookHandler();
  await whHandler.send({
    ...expected,
    url,
    secret: wh.secret,
    event: wh.event
  });

  const updatedEvt = db
    .prepare(`SELECT * FROM events WHERE id = ?`)
    .get(expected.id);
  t.assert(updatedEvt.trys === 1);
  t.assert(updatedEvt.lastTry !== expected.lastTry);

  t.teardown(teardown);
});

test("delivering a webhook when the receiving server is down", async t => {
  init();
  const wh = {
    id: "abc",
    url: "http://1234surelydoesntexist.com",
    secret: "aaaaaaaaaa",
    event: "incomingMessage"
  };
  webhooks.store(wh);
  const expected = {
    id: "abc",
    name: "incomingMessage",
    message: '{"hello":"world"}',
    trys: 0,
    lastTry: new Date().toISOString(),
    webhookId: wh.id
  };
  events.store(expected);
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const dbEvt = db
    .prepare(`SELECT * FROM events WHERE id = ?`)
    .get(expected.id);
  t.assert(dbEvt);

  const whHandler = new WebhookHandler();
  await whHandler.send({
    ...expected,
    secret: wh.secret,
    event: wh.event,
    url: wh.url
  });

  const updatedEvt = db
    .prepare(`SELECT * FROM events WHERE id = ?`)
    .get(expected.id);
  t.assert(updatedEvt.trys === 1);
  t.assert(updatedEvt.lastTry !== expected.lastTry);

  t.teardown(teardown);
});

test("if connection is timing out when server is not responding with 200 OK", async t => {
  init();
  const worker = await createWorker(`
		app.post("/", function(req, res) {
      // NOTE: We intentionally sleep here and hold the connection open to see
      // if the webhook delivery automatically times out.
      require("child_process").execSync("sleep 50");
      res.status(200).send();
		});
	`);

  const wh = {
    id: "abc",
    url: `http://localhost:${worker.port}`,
    secret: "aaaaaaaaaa",
    event: "incomingMessage"
  };
  webhooks.store(wh);
  const expected = {
    id: "abc",
    name: "incomingMessage",
    message: '{"hello":"world"}',
    trys: 0,
    lastTry: new Date().toISOString(),
    webhookId: wh.id
  };
  events.store(expected);
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const dbEvt = db
    .prepare(`SELECT * FROM events WHERE id = ?`)
    .get(expected.id);
  t.assert(dbEvt);

  const whHandler = new WebhookHandler();
  await whHandler.send({
    ...expected,
    secret: wh.secret,
    event: wh.event,
    url: wh.url
  });
  const updatedEvt = db
    .prepare(`SELECT * FROM events WHERE id = ?`)
    .get(expected.id);
  t.assert(updatedEvt.trys === 1);
  t.assert(updatedEvt.lastTry !== expected.lastTry);

  t.teardown(teardown);
});

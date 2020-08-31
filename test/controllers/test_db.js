// @format
const path = require("path");
const src = "../../src";
require("dotenv").config({ path: path.resolve(src, `.env`) });
const test = require("ava").serial;
const { existsSync, unlinkSync } = require("fs");
const sqlite = require("better-sqlite3");

const { init } = require(`${src}/controllers/db.js`);
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

test("if init function creates db schema", t => {
  init();
  t.assert(existsSync(sqlConfig.path));
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const tableName = "sms";
  const table = db
    .prepare(`SELECT name FROM sqlite_master WHERE name= ?`)
    .get(tableName);
  t.assert(table.name === tableName);

  t.teardown(teardown);
});

test("if init function skips schema creation when one already exists", t => {
  init();
  init();
  t.assert(true);
  t.teardown(teardown);
});

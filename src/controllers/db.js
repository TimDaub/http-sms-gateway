// @format
require("dotenv").config();
const sqlite = require("better-sqlite3");
const path = require("path");
const { readFileSync, unlinkSync } = require("fs");

const logger = require("../logger.js");
const { DB_PATH, SQLITE_SCHEMA_PATH } = process.env;

const sqlConfig = {
  path: path.resolve(__dirname, `../../${DB_PATH}`),
  schema: path.resolve(__dirname, `../../${SQLITE_SCHEMA_PATH}`),
  options: {
    // NOTE: When trying to use the dedicated logger here, errors are thrown
    // when trying to write data into the SQL DB.
    verbose: console.info
  }
};

function dump() {
  unlinkSync(sqlConfig.path);
}

function init() {
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const schema = readFileSync(sqlConfig.schema).toString();

  try {
    logger.info(`Trying to initialize database at path: ${sqlConfig.path}`);
    db.exec(schema);
  } catch (err) {
    if (
      err instanceof sqlite.SqliteError &&
      new RegExp(".*table.*already exists").test(err.message)
    ) {
      logger.info("Skipping database initialization; already exists");
    } else {
      logger.error(err);
    }
  }
}

const outgoing = {
  store: function(msg) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    logger.info("Storing outgoing messages", msg);
    return db
      .prepare(
        `
    INSERT INTO outgoing (id, receiver, text, status)
    VALUES (@id, @receiver, @text, @status)
    `
      )
      .run(msg);
  },

  getAllMessages: function(_status) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    return db.prepare("SELECT * FROM outgoing WHERE status = ?").all(_status);
  },

  updateStatus: function(id, _status) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    logger.info("Updating outgoing message status", id, _status);
    return db
      .prepare("UPDATE outgoing SET status = @_status WHERE id = @id")
      .run({
        id,
        _status
      });
  }
};

const incoming = {
  store: function(msg) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    // NOTE: SQLite cannot store datetime objects.
    msg.dateTimeSent = msg.dateTimeSent.toISOString();
    logger.info("Storing incoming message", msg);
    db.prepare(
      `
      INSERT INTO incoming (id, sender, text, dateTimeSent)
      VALUES (@id, @sender, @message, @dateTimeSent)
    `
    ).run(msg);
  },

  list: function(sender) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    return db.prepare("SELECT * FROM incoming WHERE sender = ?").all(sender);
  }
};

module.exports = {
  init,
  dump,
  outgoing,
  incoming
};

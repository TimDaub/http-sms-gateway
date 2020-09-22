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
    msg.dateTimeCreated = new Date().toISOString();

    logger.info(`Storing outgoing message ${JSON.stringify(msg)}`);
    return db
      .prepare(
        `
    INSERT INTO outgoing (id, receiver, text, status, dateTimeCreated)
    VALUES (@id, @receiver, @text, @status, @dateTimeCreated)
    `
      )
      .run(msg);
  },

  getAllMessages: function(_status) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    return db.prepare("SELECT * FROM outgoing WHERE status = ?").all(_status);
  },

  popAllMessages: function(_status) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);

    const msgs = db.transaction(() => {
      const msgs = db
        .prepare("SELECT * FROM outgoing WHERE status = ?")
        .all(_status);
      db.prepare("UPDATE outgoing SET status = ?").run("PROCESSING");
      return msgs;
    })();
    return msgs;
  },

  updateStatus: function(id, _status) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    logger.info(`Updating outgoing message status ${id} ${_status}`);
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
    msg.dateTimeCreated = new Date().toISOString();
    msg.dateTimeSent = msg.dateTimeSent.toISOString();

    logger.info(`Storing incoming message ${JSON.stringify(msg)}`);
    return db
      .prepare(
        `
      INSERT INTO incoming (id, sender, text, dateTimeCreated, dateTimeSent)
      VALUES (@id, @sender, @message, @dateTimeCreated, @dateTimeSent)
    `
      )
      .run(msg);
  },

  list: function(sender) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    return db.prepare("SELECT * FROM incoming WHERE sender = ?").all(sender);
  }
};

const webhooks = {
  store: function(webhook) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    logger.info(`Storing webhook ${JSON.stringify(webhook)}`);
    return db
      .prepare(
        `
      INSERT INTO webhooks (id, url, secret, event)
      VALUES (@id, @url, @secret, @event)
    `
      )
      .run(webhook);
  }
};

const events = {
  store: function(evt) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    const dateTimeCreated = new Date().toISOString();
    evt = { ...evt, dateTimeCreated };

    logger.info(`Storing event ${JSON.stringify(evt)}`);
    return db
      .prepare(
        `
      INSERT INTO events (id, name, message, dateTimeCreated)
      VALUES (@id, @name, @message, @dateTimeCreated)
      `
      )
      .run(evt);
  }
};

module.exports = {
  init,
  dump,
  outgoing,
  incoming,
  webhooks,
  events
};

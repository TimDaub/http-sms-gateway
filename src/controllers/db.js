// @format
require("dotenv").config();
const sqlite = require("better-sqlite3");
const path = require("path");
const { readFileSync, unlinkSync } = require("fs");

const logger = require("../logger.js");
const { DB_PATH, SQLITE_SCHEMA_PATH, NODE_ENV } = process.env;

const sqlConfig = {
  path: path.resolve(__dirname, `../../${DB_PATH}`),
  schema: path.resolve(__dirname, `../../${SQLITE_SCHEMA_PATH}`),
  options: {
    // NOTE: When trying to use the dedicated logger here, errors are thrown
    // when trying to write data into the SQL DB.
    verbose: NODE_ENV !== "production" ? console.info : null
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
      db.prepare("UPDATE outgoing SET status = ?").run("SENDING");
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
  },
  remove(id) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    return db.transaction(() => {
      const webhook = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id);
      if (webhook) {
        return db.prepare("DELETE FROM webhooks WHERE id = ?").run(id);
      } else {
        throw new Error("Webhook wasn't deleted because id wasn't found");
      }
    })();
  },
  list: function(evt) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    return db.prepare("SELECT * FROM webhooks WHERE event = ?").all(evt);
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
      INSERT INTO events (
        id,
        name,
        message,
        dateTimeCreated,
        trys,
        lastTry,
        webhookId
      ) VALUES (
        @id,
        @name,
        @message,
        @dateTimeCreated,
        @trys,
        @lastTry,
        @webhookId
      )
      `
      )
      .run(evt);
  },
  decayedList: function() {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    // NOTE: We join the list of events with the webhooks table
    return db
      .prepare(
        `
          SELECT
            events.id,
            events.name,
            events.message,
            events.dateTimeCreated,
            events.trys,
            events.lastTry,
            webhooks.url,
            webhooks.secret,
            webhooks.event
          FROM events INNER JOIN webhooks
          ON events.webhookId = webhooks.id
          WHERE
            dateTime(events.lastTry) <= datetime(
              'now',
              printf('-%d minutes', 1 << events.trys)
            )
            AND events.trys < 12
            OR events.trys == 0
        `
      )
      .all();
  },
  remove(id) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    return db.prepare("DELETE FROM events WHERE id = ?").run(id);
  },
  updateTrys(id) {
    const db = sqlite(sqlConfig.path, sqlConfig.options);
    const lastTry = new Date().toISOString();
    const res = db
      .prepare(
        `
      UPDATE events
      SET trys = trys + 1, lastTry = @lastTry
      WHERE id = @id
    `
      )
      .run({ id, lastTry });

    if (res.changes !== 1) {
      throw new Error(
        "When trying to update event's trys, nothing was updated"
      );
    }
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

require("dotenv").config();
const sqlite = require("better-sqlite3");
const path = require("path");
const { readFileSync, unlinkSync } = require("fs");
const appDir = path.dirname(require.main.filename);

const { DB_PATH, SQLITE_SCHEMA_PATH } = process.env;

const sqlConfig = {
  path: path.resolve(__dirname, `../../${DB_PATH}`),
  schema: path.resolve(__dirname, `../../${SQLITE_SCHEMA_PATH}`),
  options: {
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
    console.info(`Trying to initialize database at path: ${sqlConfig.path}`);
    db.exec(schema);
  } catch (err) {
    if (
      err instanceof sqlite.SqliteError &&
      new RegExp(".*table.*already exists").test(err.message)
    ) {
      console.info("Skipping database initialization; already exists");
    } else {
      console.error(err);
    }
  }
}

function store(msg) {
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  return db
    .prepare(
      `
  INSERT INTO outgoing (id, receiver, text, status)
  VALUES (@id, @receiver, @text, @status)
  `
    )
    .run(msg);
}

function getAllMessages(_status) {
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  return db.prepare("SELECT * FROM outgoing WHERE status = ?").all(_status)
}

function updateStatus(id, _status) {
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  return db.prepare("UPDATE outgoing SET status = @_status WHERE id = @id").run({
    id,
    _status
  })
}

module.exports = { init, store, dump, getAllMessages, updateStatus };

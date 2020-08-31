require("dotenv").config();
const sqlite = require("better-sqlite3");
const path = require("path");
const { readFileSync } = require("fs");
const appDir = path.dirname(require.main.filename);

const { DB_PATH, SQLITE_SCHEMA_PATH } = process.env;

const sqlConfig = {
	path: path.resolve(__dirname, `../../${DB_PATH}`),
	schema: path.resolve(__dirname, `../../${SQLITE_SCHEMA_PATH}`),
	options: {
		verbose: console.info
	}
};

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
// noop for now
}

module.exports = { init, store };

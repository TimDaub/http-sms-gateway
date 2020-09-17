CREATE TABLE outgoing (
  id TEXT NOT NULL PRIMARY KEY,
  receiver TEXT NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL,
  dateTimeCreated TEXT NOT NULL
);

CREATE TABLE incoming (
  id TEXT NOT NULL PRIMARY KEY,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  dateTimeCreated TEXT NOT NULL,
  dateTimeSent TEXT NOT NULL
);

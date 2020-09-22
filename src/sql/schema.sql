CREATE TABLE outgoing (
  id TEXT NOT NULL PRIMARY KEY,
  receiver TEXT NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL,
  dateTimeCreated TEXT NOT NULL
);

CREATE TABLE incoming (
  id TEXT NOT NULL PRIMARY KEY UNIQUE,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  dateTimeCreated TEXT NOT NULL,
  dateTimeSent TEXT NOT NULL
);

CREATE TABLE webhooks (
  id TEXT NOT NULL PRIMARY KEY,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  event TEXT NOT NULL
);

CREATE TABLE events (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  dateTimeCreated TEXT NOT NULL
);

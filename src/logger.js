// @format
const pino = require("pino");
const { logger: loggerOptions } = require("./options.js");

module.exports = pino(loggerOptions);

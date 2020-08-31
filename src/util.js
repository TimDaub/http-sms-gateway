// @format
const crypto = require("crypto");

function genHash(s) {
  return crypto
    .createHash("sha256")
    .update(s, "string")
    .digest("hex");
}

module.exports = { genHash };

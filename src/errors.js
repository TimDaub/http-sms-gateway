//@format
class ImplementationError extends Error {
  constructor(...params) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ImplementationError);
    }

    this.name = "ImplementationError";
  }
}

module.exports = { ImplementationError };

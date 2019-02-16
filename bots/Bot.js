class BotError extends Error {
  constructor(message = "Ошибка", data = {}) {
    super(message);

    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BotError);
    }

    this.data = {
      "⏱": new Date().toLocaleString("ru-RU", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      ...data
    };
  }
}

module.exports = { BotError };

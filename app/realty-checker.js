const { sendReport } = require("../lib/mordobot");
const { RealtyChecker } = require("../lib/bots/Realty");

(async () => {
  const bot = await new RealtyChecker();

  bot.on("error", async (message, data) => {
    console.error(message);
    console.error(data.error || "");
    await sendReport(`⛈ REALTY_CHECKER: <b>${message}</b>`, data);
  });
  bot.on("warning", async (message, data) => {
    console.error(message);
    await sendReport(`🌥 REALTY_CHECKER: <b>${message}</b>`, data);
  });

  try {
    await bot.mine();
  } catch (error) {
    console.error(error);

    await Promise.all([
      await sendReport("🔥 REALTY_CHECKER: <b>Упал</b>", { error }),
      await bot.stop()
    ]);

    setTimeout(() => {
      throw new Error(error.message);
    }, 5000);
  }
})();

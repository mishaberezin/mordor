const CianChecker = require("../bots/cian-checker");

const { sendReport } = require("../lib/mordobot");

(async () => {
  const robot = new CianChecker();

  robot.on("error", async (message, extra) => {
    console.error(message, extra.error || "");
    await sendReport(`⛈ CIAN_CHECKER: <b>${message}</b>`, extra);
  });
  robot.on("warning", async (message, extra) => {
    console.error(message);
    await sendReport(`🌥 CIAN_CHECKER: <b>${message}</b>`, extra);
  });

  try {
    await robot.mine();
  } catch (error) {
    console.error(error);

    await Promise.all([
      await sendReport("🔥 CIAN_CHECKER: <b>Упал</b>", { error }),
      await robot.stop()
    ]);

    setTimeout(() => {
      throw error;
    }, 5000);
  }
})();

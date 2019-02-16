const { sendReport } = require("../lib/mordobot");
const { CianCrawler } = require("../bots/CianCrawler");

(async () => {
  const robot = new CianCrawler();

  robot.on("error", async (message, extra) => {
    console.error(message, extra.error || "");
    await sendReport(`⛈ CIAN_CRAWLER: <b>${message}</b>`, extra);
  });
  robot.on("warning", async (message, extra) => {
    console.error(message);
    await sendReport(`🌥 CIAN_CRAWLER: <b>${message}</b>`, extra);
  });

  try {
    await robot.mine();
  } catch (error) {
    console.error(error);

    await Promise.all([
      await sendReport("🔥 CIAN_CRAWLER: <b>Упал</b>", { error }),
      await robot.stop()
    ]);

    setTimeout(() => {
      throw new Error(error.message);
    }, 5000);
  }
})();

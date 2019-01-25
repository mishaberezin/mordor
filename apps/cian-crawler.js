const CianCrawler = require("../bots/cian-crawler");

const { sendReport } = require("../lib/mordobot");

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
      throw error;
    }, 5000);
  }
})();

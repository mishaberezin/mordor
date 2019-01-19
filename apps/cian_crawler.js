const { sendReport } = require("../lib/mordobot");
const { CianCrawler } = require("../miners/Cian");

(async () => {
  const robot = new CianCrawler();

  robot.on("error", async (message, extra) => {
    console.error(message, extra.error || "");
    await sendReport(`⛈ CIAN_CRAWLER: <b>${message}</b>`, extra);
  });

  await robot.mine().catch(async error => {
    console.error(error);
    await sendReport("🔥 CIAN_CRAWLER: <b>Упал</b>", { error });

    setTimeout(() => {
      throw error; // Перезапускает процесс
    }, 5000);
  });
})();

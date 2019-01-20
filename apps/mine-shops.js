const mine = require("../bots/mine-shops");
const db = require("../lib/db");

mine()
  .then(async res => {
    const addResult = await db.addPlaces(res);
    console.log(addResult);
    process.exit(0);
    return addResult;
  })
  .catch(e => {
    console.error("Что-то пошло не так");
    console.error(e);
    process.exit();
  });

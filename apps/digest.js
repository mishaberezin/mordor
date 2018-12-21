require("../lib/digest.js")().catch(err => {
  console.error(err);
  process.exit(1);
});

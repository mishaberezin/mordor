const fs = require("fs").promises;
const path = require("path");
const config = require("config");
const uddDir = config.get("fs.uddDir");

const mutex = ({ fromPath, destPath }) => ({
  path: destPath,
  unlock: async () => {
    await fs.rename(destPath, fromPath);
  }
});

module.exports = async key => {
  const allUDDs = await fs.readdir(uddDir).catch(error => []);
  const fitUDDs = allUDDs.filter(
    udd => udd.startsWith(key) && !udd.endsWith(".lock")
  );

  for (const udd of fitUDDs) {
    const fromPath = path.resolve(uddDir, udd);
    const destPath = fromPath + ".lock";

    try {
      await fs.rename(fromPath, destPath);
      return mutex({ fromPath, destPath });
    } catch (error) {
      continue;
    }
  }

  const udd = `${key}_${Date.now()}`;
  const fromPath = path.resolve(uddDir, udd);
  const destPath = path.resolve(uddDir, udd + ".lock");

  return mutex({ fromPath, destPath });
};

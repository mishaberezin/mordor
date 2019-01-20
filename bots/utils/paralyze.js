module.exports = (page, callback) => {
  const orig = page.goto;
  const lock = new Promise(resolve => callback(resolve));

  page.goto = async (...args) => {
    await lock;
    page.goto = orig;
    return page.goto(...args);
  };
  page.paralyzed = true;
};

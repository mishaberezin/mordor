const everpage = browser => {
  let page;
  return async () => {
    if (page === undefined || page.isClosed()) {
      page = await browser.newPage();
    }
    return page;
  };
};

module.exports = everpage;

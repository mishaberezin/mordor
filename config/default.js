var defer = require("config/defer").deferConfig;

module.exports = {
  db: {
    host: "localhost",
    name: "apt-finder",
    url: defer(({ db: { user, pass, host, name, authSource } }) => {
      if (user && pass) {
        return `mongodb://${user}:${pass}@${host}/${name}?authSource=${authSource}`;
      } else {
        return `mongodb://${host}/${name}`;
      }
    })
  },
  api: {
    host: "localhost",
    port: "3000",
    url: defer(({ api: { host, port } }) => {
      return `http://${host}:${port}`;
    })
  },
  sentry: {
    host: "sentry.io",
    dsn: defer(({ sentry: { key, host, project } }) => {
      if (key && project) {
        return `https://${key}@${host}/${project}`;
      } else {
        return undefined;
      }
    })
  }
};

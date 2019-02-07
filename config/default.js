const path = require("path");
const defer = require("config/defer").deferConfig;
const resolve = (...args) => path.resolve(__dirname, "..", ...args);

require("dotenv").config(); // .env 🛫

module.exports = {
  fs: {
    prjDir: resolve(),
    tmpDir: resolve(".tmp"),
    cacheDir: resolve(".tmp/cache"),
    uddDir: resolve(".tmp/udd")
  },
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
        return "";
      }
    })
  },
  cloudinary: {
    host: "api.cloudinary.com",
    api: defer(({ cloudinary: { host, cloudName } }) => {
      return {
        imageUpload: `https://${host}/v1_1/${cloudName}/image/upload`
      };
    }),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
  }
};

const config = require("config");
const tempy = require("tempy");
const cloudinary = require("cloudinary");

module.exports = async page => {
  const tmpath = tempy.file();

  await page.screenshot({
    path: tmpath,
    type: "jpeg",
    quality: 10
  });

  const result = await new Promise(resolve =>
    cloudinary.v2.uploader.unsigned_upload(
      tmpath,
      config.get("cloudinary.uploadPreset"),
      { cloud_name: config.get("cloudinary.cloudName") },
      (error, result) => {
        resolve(result);
      }
    )
  );

  return result.url;
};

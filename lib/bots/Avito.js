// /* eslint-disable */

// const { URL } = require("url");
// const puppeteer = require("puppeteer");
// const shuffle = require("lodash/shuffle");
// const fetch = require("node-fetch");
// const Canvas = require("canvas");

// const Image = Canvas.Image;
// const OCRAD = require("../../node_modules/ocrad.js/ocrad.js");

// /**
//  * Возвращает список ссылок на объявления с текущей страницы выдачи.
//  *
//  * @async
//  * @param {Object} page – puppeteer.launch({}).newPage()
//  *
//  * @return {Promise<string[]>} – массив ссылок
//  */
// async function getLinks(page) {
//   return await page.evaluate(() =>
//     [].map.call(
//       document.querySelectorAll(".js-catalog-item-enum"),
//       el => el.querySelector(".item-description-title-link").href
//     )
//   );
// }

// /**
//  * Возвращает данные объявления.
//  *
//  * @async
//  * @param {Object} page – puppeteer.launch({}).newPage()
//  * @param {string} pageUrl – URL адрес объявления.
//  *
//  * @return {Promise<Object[]>}
//  */
// async function getDetails(page, pageUrl) {
//   // @deemidroll: добавить недостающие поля:
//   // addedTimestamp: Number,
//   const itemDetails = {
//     serviceName: "Avito",
//     timestamp: Date.now(),
//     url: pageUrl
//   };

//   try {
//     await page.goto(pageUrl, { waitUntil: "networkidle0" });
//     await page.click(".js-item-phone-button_card");
//     await page.waitForSelector(".js-item-phone-big-number img[src]");

//     Object.assign(
//       itemDetails,
//       await page.evaluate(() => {
//         function getParam(name) {
//           return (
//             [].filter.call(
//               document.querySelectorAll(".item-params-list-item"),
//               el => new RegExp(name).test(el.innerText)
//             )[0] || {}
//           ).innerText;
//         }

//         const __totalArea = getParam("Общая площадь");
//         const totalArea = Number(__totalArea.match(/\d+(.\d+)?/)[0]);
//         const __roomsCount = getParam("Количество комнат");
//         const roomsCount = Number(__roomsCount.match(/\d+/)[0]);
//         const __type = getParam("Тип дома");
//         const type = __type.slice(10);
//         const __floor = getParam("Этаж");
//         const floor = Number(__floor.match(/\d+/)[0]);
//         const __floorsCount = getParam("Этажей в доме");
//         const floorsCount = Number(__floorsCount.match(/\d+/)[0]);

//         console.log("__floor", __floor);

//         const __sellerInfo = (document.querySelector(".js-seller-info") || {})
//           .innerText;

//         let metro = [].map.call(
//           document.querySelectorAll(".item-map-metro"),
//           el => el.innerText.match(/(.+)\(/)[1].trim()
//         )[0];

//         metro = metro ? `м. ${metro}` : "";

//         return {
//           // price: avito.item.price,
//           // addressRaw: avito.item.location,
//           // __title: avito.item.title,
//           // serviceId: avito.item.id,
//           description: document.querySelector("[itemprop=description]")
//             .innerText,
//           __sellerInfo,
//           isAgent: /Агентство/.test(__sellerInfo),
//           __phoneImage: document.querySelector(".js-item-phone-big-number img")
//             .src,
//           photos: [].map.call(
//             document.querySelectorAll(".gallery-list-item-link"),
//             el =>
//               `https:${el.style.backgroundImage
//                 // "url("//92.img.avito.st/75x55/2795968092.jpg")"
//                 // →
//                 // "//92.img.avito.st/75x55/2795968092.jpg"
//                 .slice(5, -2)
//                 .replace("75x55", "640x480")}`
//           ),
//           __totalArea,
//           totalArea,
//           __roomsCount,
//           roomsCount,
//           metro,
//           __type,
//           type,
//           __floor,
//           floor,
//           __floorsCount,
//           floorsCount
//         };
//       })
//     );

//     Object.assign(itemDetails, {
//       phone: recognizePhone(itemDetails.__phoneImage)
//     });
//   } catch (error) {
//     console.error("Persing Erorr →", error);
//     itemDetails.error = error;
//   }

//   return itemDetails;
// }

// /**
//  * Возвращает распознанный телефон из картинки.
//  *
//  * @param {string} base64strin – картинка в формате data url base64.
//  *
//  * @return {string} – распознанный текст телефона.
//  */
// function recognizePhone(base64string) {
//   // Исользуем размер картинки как на странице квартиры.
//   const w = 317;
//   const h = 50;
//   const canvas = new Canvas(w, h);
//   const ctx = canvas.getContext("2d");
//   const img = new Image();

//   img.src = base64string;

//   // Картинка с телефоном прозрачная.
//   // Добавляем белый фон, чтобы улучшить распознавание.
//   ctx.fillStyle = "white";
//   ctx.fillRect(0, 0, w, h);
//   ctx.drawImage(img, 0, 0, w, h);

//   return (
//     OCRAD(canvas)
//       // '8 985 224-33-04\n' → '89852243304'
//       .replace(/\D/g, "")
//   );
// }

// /**
//  * Возвращает ссылки на объявления и идет на следующую страницу выдачи.
//  *
//  * @async
//  * @param {Object} page – puppeteer.launch({}).newPage()
//  *
//  * @return {Promise<Object[]>}
//  */
// async function getLinksAndGoNext(page, pageNumber, metroId) {
//   const avitoUrl =
//     "https://www.avito.ru/moskva/kvartiry/sdam/na_dlitelnyy_srok";
//   const pageUrl = new URL(avitoUrl);

//   pageUrl.search = `metro=${metroId}`;

//   if (pageNumber) {
//     pageUrl.search += `&p=${pageNumber}`;
//   }

//   await page.goto(pageUrl, { waitUntil: "networkidle0" });

//   const res = { pageLinks: await getLinks(page) };

//   try {
//     await page.click(".js-pagination-next");
//     // @deemidroll: удалить символ ноля в конце селектора.
//     // await page.click('.js-pagination-next0');
//     await page.waitForNavigation({ waitUntil: "networkidle0" });
//     res.hasNext = true;
//   } catch (error) {
//     res.hasNext = false;
//   }

//   return res;
// }

// async function getItems(pageNumber = 0) {
//   const browser = await puppeteer.launch({
//     // headless: false
//   });

//   const page = await browser.newPage();

//   await page.setViewport({ width: 990, height: 600 });
//   await page.bringToFront();

//   let count = 0;

//   console.info("Avito: Поиск объявлений");

//   const metroIds = shuffle(await getMetroIds());
//   let metroIdsCount = 0;

//   while (true) {
//     const metroId = metroIds[metroIdsCount];
//     const res = await getLinksAndGoNext(page, pageNumber, metroId);
//     const len = res.pageLinks.length;
//     await getItemsFromChunck(page, res.pageLinks);
//     count += len;
//     console.info("Страница:", pageNumber, "Метро", metroId);
//     console.info("Пачка объявлений:", len);
//     console.info("Всего объявлений:", count);

//     if (res.hasNext) {
//       pageNumber += 1;
//       console.info("Есть ещё");
//     } else {
//       pageNumber = 0;
//       metroIdsCount += 1;
//       console.info("Следующая станция метро", metroId);
//     }

//     if (metroIdsCount === metroIds.length) {
//       metroIdsCount = 0;
//       console.info("Начать заново");
//     }
//   }
// }

// async function getItemsFromChunck(page, links) {
//   // deemidroll: remove start
//   // links = links.slice(0, 1);
//   // deemidroll: remove end
//   while (links.length) {
//     await sendItem(await getDetails(page, links.pop()));
//   }
// }

// async function sendItem(item) {
//   console.log("Отправлено в endpoint:", item);

//   fetch("http://localhost:3000/offers/add", {
//     method: "POST",
//     headers: {
//       Accept: "application/json",
//       "Content-Type": "application/json"
//     },
//     body: JSON.stringify([item])
//   })
//     .then(res => console.log(">>>>>>>", res))
//     .catch(error => console.error("!!!!!!!", error));
// }

// async function getMetroIds() {
//   const metroMapUrl =
//     "https://www.avito.ru/s/avito/components/metro-map/svg-maps/metro-map-moscow.svg";

//   const browser = await puppeteer.launch({
//     // Раскомментировать, чтобы увидеть браузер.
//     // headless: false
//   });

//   const page = await browser.newPage();

//   await page.setViewport({ width: 990, height: 600 });
//   await page.bringToFront();
//   await page.goto(metroMapUrl, { waitUntil: "networkidle0" });

//   const metroIds = await page.evaluate(() => [
//     ...new Set(
//       Array.from(document.querySelectorAll("[data-st-id]")).map(
//         item => item.attributes["data-st-id"].value
//       )
//     )
//   ]);

//   browser.close();

//   return metroIds;
// }

// // deemidroll: remove start
// (async () => {
//   await getItems();
// })();
// // deemidroll: remove end

// // deemidroll: remove start
// // (async () => {
// //     const item = {
// //         // url: 'urlString',
// //         timestamp: Math.floor(Date.now() / 1000)
// //     };
// //     await sendItem(item);
// // })()
// // deemidroll: remove end

// module.exports = () => getItems();

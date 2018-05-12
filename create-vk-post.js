const fetch = require('node-fetch');
const FormData = require('form-data');
const request = require('request');
const { execSync } = require('child_process');
const Typograf = require('typograf');
const tp = new Typograf({locale: ['ru', 'en-US']});
tp.enableRule('*');

const VK_API_URL = 'https://api.vk.com/method/';
const VK_API_V = '5.74';
// const GROUP_ID = '165699285';
const GROUP_ID = '166351231';
const ALBUM_ID = '254084345';
const ACCESS_TOKEN = '9af0e6f11acbd4e6d71617281943b5d850f29d7cb9c6e217737eafacaf30631a2f6987d60f4ac6190e42c';
const VK_BASE_Q = `&access_token=${ACCESS_TOKEN}&v=${VK_API_V}`;

const POST_URL = `${VK_API_URL}wall.post?owner_id=-${GROUP_ID}&from_group=1&${VK_BASE_Q}`;

module.exports = async offer => {
    const pictures = await uploadPicturesToVk(offer.photos.split(','))
        .then(res => res.map(p => `photo${p.owner_id}_${p.id}`).join(','));

    const text = await getText(offer);
    const url = await getUrl(text, pictures);

    return fetch(url, {
        method: 'GET'
    })
        .then(res => res.json())
        .then(res => {
            console.log(res)
            if (res.response.post_id) {
                offer.published = true;
            }

            return offer;
        })
        .catch(err => {
            console.error(err);
            process.exit();
        })
};

const getText = async offer => {
    let desc = await fixSpelling(offer.description.slice(0, 200)).then(typograf);

    text = `${offer.metro} / ${new Intl.NumberFormat('ru-RU').format(offer.price)}₽`;

    if (offer.roomsCount) {
        text += `\n\n ${offer.roomsCount}-комн. `
    }

    if (offer.totalArea) {
        text += `${offer.totalArea}м²\n`
    }

    text += `${desc}`;

    return encodeURIComponent(text + (text.length > 200 ? '…' : '') + `\n\n${offer.url}`);
};

const getUrl = async (text, pictures) => {
    return `${POST_URL}&message=${text}&attachments=${pictures}`;
};

const getVkUploadServer = async (groupId, albumId) => {
    return fetch(`${VK_API_URL}photos.getUploadServer?album_id=${groupId}&group_id=${albumId}${VK_BASE_Q}`)
        .then(res => res.json())
        .then(res => {
            return res.response }); };

const uploadPicturesToVk = async links => {
    const vkUploadServer = (await getVkUploadServer(ALBUM_ID, GROUP_ID)).upload_url;
    const form = new FormData();

    links.slice(0, 5).forEach((link, i) => {
        form.append(`file${i}`, processPicture(request(link)));
    });

    return fetch(vkUploadServer, { method: 'post', body: form })
        .then(res => res.json())
        .then(res => {
            return fetch(`${VK_API_URL}photos.save?album_id=${res.aid}&group_id=${res.gid}&photos_list=${res.photos_list}&server=${res.server}&hash=${res.hash}${VK_BASE_Q}`)
                .then(res => res.json())
                .then(res => res.response);
        })
    .catch(console.error)
};

// Adding border, etc.
const processPicture = stream => {
    return stream;
};

const fixSpelling = async text => {
    const url = `https://speller.yandex.net/services/spellservice.json/checkText?text=${encodeURIComponent(text)}&lang=ru`;

    return fetch(url)
        .then(res => res.json())
        .then(res => {
            if (res.length) {
                res.forEach(m => {
                    text = text.slice(0, m.pos) + m.s[0] + text.slice(m.pos + m.len);
                });
            }

            return text;
        })
};

const typograf = text => tp.execute(text);

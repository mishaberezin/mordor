const _ = require('lodash');
const fs = require('fs');
const path = require('path');
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

const ALBUM_OWNER_ID = '26747655'; // smdenis's vk id
const ALBUM_ID = '254484026'; // smdenis's hidden album

const ACCESS_TOKEN = '9af0e6f11acbd4e6d71617281943b5d850f29d7cb9c6e217737eafacaf30631a2f6987d60f4ac6190e42c';
const VK_BASE_Q = `&access_token=${ACCESS_TOKEN}&v=${VK_API_V}`;

const POST_URL = `${VK_API_URL}wall.post?owner_id=-${GROUP_ID}&from_group=1&${VK_BASE_Q}`;

module.exports = async offer => {
    const description = await getDescription(offer);
    const picLocators = await uploadPicturesToVk(offer.photos)
        .then(pictures => pictures.map(picture => {
            return `photo${picture.owner_id}_${picture.id}`
        }).join(','))
        .catch(console.error);

    const url = `${POST_URL}&message=${description}&attachments=${picLocators}`;

    const response = await fetch(url, { method: 'GET' });
    const respData = await response.json();

    console.log(respData)

    if (!respData || !respData.response || !respData.response.post_id) {
        throw new Error('Не смогли опубликовать пост');
    }

    return respData.response.post_id;
};

const getDescription = async offer => {
    let desc = await fixSpelling(offer.description.slice(0, 200)).then(typograf);

    text = `${offer.metro || ''} / ${new Intl.NumberFormat('ru-RU').format(offer.price)}₽`;

    if (offer.roomsCount) {
        text += `\n\n ${offer.roomsCount}-комн. `
    }

    if (offer.totalArea) {
        text += `${offer.totalArea}м²\n`
    }

    text += `${desc}`;

    return encodeURIComponent(text + (text.length > 200 ? '…' : '') + `\n\n${offer.url}`);
};

const getVkUploadServer = async (albumId, groupId) => {
    return fetch(`${VK_API_URL}photos.getUploadServer?album_id=${albumId}${VK_BASE_Q}`)
        .then(res => res.json())
        .then(res => {
            return res.response }); };

const uploadPicturesToVk = async links => {
    const vkUploadServer = (await getVkUploadServer(ALBUM_ID, GROUP_ID)).upload_url;

    return Promise.all(
            _.chunk(links.slice(0, 10), 5).map(chunk => uploadSomePicturesToVk({ links: chunk, vkUploadServer }))
        )
        .then(_.flatten)
        .then(data => {
            return data;
        })
        .catch(console.error);
};

const uploadSomePicturesToVk = async ({ links, vkUploadServer }) => {
    const form = new FormData();

    links.forEach((link, i) => {
        const ext = path.extname(link);
        const hasExtHint = ['jpg', 'jpeg', 'png'].includes(ext);

        form.append(`file${i}`, processPicture(request(link)), hasExtHint ? {} : { filename: 'file.jpg' });
    });

    return fetch(vkUploadServer, { method: 'post', body: form })
        .then(res => res.json())
        .then(res => {
            return fetch(`${VK_API_URL}photos.save?album_id=${res.aid}&photos_list=${res.photos_list}&server=${res.server}&hash=${res.hash}${VK_BASE_Q}`)
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
        .catch(console.error)
};

const typograf = text => tp.execute(text);

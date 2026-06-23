/**
 * services/telegram.service.js
 */

const fs       = require('fs');
const path     = require('path');
const https    = require('https');
const FormData = require('form-data');

const TELEGRAM_MAX_BYTES = 49 * 1024 * 1024;

function baseUrl() {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
}
function assertConfig() {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set');
  if (!process.env.TELEGRAM_CHAT_ID)   throw new Error('TELEGRAM_CHAT_ID not set');
}
function postForm(url, form) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers: form.getHeaders() }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (!json.ok) return reject(new Error(`Telegram: ${json.description}`));
          resolve(json.result);
        } catch (e) { reject(new Error('Bad Telegram response: ' + body)); }
      });
    });
    req.on('error', reject);
    form.pipe(req);
  });
}
function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (!json.ok) return reject(new Error(`Telegram: ${json.description}`));
          resolve(json.result);
        } catch (e) { reject(new Error('Bad Telegram response: ' + body)); }
      });
    }).on('error', reject);
  });
}

async function sendVideo(filePath, caption = '') {
  assertConfig();
  const { size } = fs.statSync(filePath);
  if (size > TELEGRAM_MAX_BYTES)
    throw new Error(`Video is ${(size/1024/1024).toFixed(1)} MB. Max 49 MB. Please compress or trim to under 1 minute.`);
  const form = new FormData();
  form.append('chat_id',            process.env.TELEGRAM_CHAT_ID);
  form.append('video',              fs.createReadStream(filePath), { filename: path.basename(filePath) });
  form.append('caption',            caption.substring(0, 1024));
  form.append('supports_streaming', 'true');
  const result  = await postForm(`${baseUrl()}/sendVideo`, form);
  const videoArr = Array.isArray(result.video) ? result.video : [result.video];
  const fileId   = videoArr[videoArr.length - 1].file_id;
  console.log(`[Telegram] Video stored → file_id=${fileId}`);
  return { fileId, messageId: result.message_id };
}

async function sendDocument(filePath, caption = '') {
  assertConfig();
  const { size } = fs.statSync(filePath);
  if (size > TELEGRAM_MAX_BYTES)
    throw new Error(`File is ${(size/1024/1024).toFixed(1)} MB. Max 49 MB.`);
  const form = new FormData();
  form.append('chat_id',  process.env.TELEGRAM_CHAT_ID);
  form.append('document', fs.createReadStream(filePath), { filename: path.basename(filePath) });
  form.append('caption',  caption.substring(0, 1024));
  const result = await postForm(`${baseUrl()}/sendDocument`, form);
  console.log(`[Telegram] Document stored → file_id=${result.document.file_id}`);
  return { fileId: result.document.file_id, messageId: result.message_id };
}

async function getDownloadUrl(fileId) {
  assertConfig();
  const result = await getJson(`${baseUrl()}/getFile?file_id=${encodeURIComponent(fileId)}`);
  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${result.file_path}`;
}

async function streamToResponse(fileId, req, res, contentType = 'video/mp4') {
  assertConfig();
  const downloadUrl = await getDownloadUrl(fileId);
  const range       = req.headers.range;
  return new Promise((resolve, reject) => {
    const reqHeaders = range ? { Range: range } : {};
    https.get(downloadUrl, { headers: reqHeaders }, tgRes => {
      const headers = {
        'Content-Type':  contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      };
      if (tgRes.headers['content-length']) headers['Content-Length'] = tgRes.headers['content-length'];
      if (tgRes.headers['content-range'])  headers['Content-Range']  = tgRes.headers['content-range'];
      res.writeHead(range ? 206 : 200, headers);
      tgRes.pipe(res);
      tgRes.on('end',   resolve);
      tgRes.on('error', reject);
    }).on('error', reject);
  });
}

async function deleteMessage(messageId) {
  assertConfig();
  await getJson(`${baseUrl()}/deleteMessage?chat_id=${encodeURIComponent(process.env.TELEGRAM_CHAT_ID)}&message_id=${messageId}`);
  console.log(`[Telegram] Message ${messageId} deleted`);
}

function isConfigured() {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

module.exports = { sendVideo, sendDocument, getDownloadUrl, streamToResponse, deleteMessage, isConfigured, TELEGRAM_MAX_BYTES };
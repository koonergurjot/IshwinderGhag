const qs = require('querystring');
const sanitizeHtml = require('sanitize-html');

const sanitize = (str) => sanitizeHtml(str, {allowedTags: [], allowedAttributes: {}});

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  }
  try {
    let data;
    const contentType = event.headers['content-type'] || '';
    const rawBody = event.body || '';
    const body = event.isBase64Encoded
      ? Buffer.from(rawBody, 'base64').toString('utf8')
      : rawBody;
    if (contentType.includes('application/json')) {
      data = JSON.parse(body || '{}');
    } else {
      data = qs.parse(body || '');
    }
    const name = sanitize(data.name);
    const email = sanitize(data.email);
    const message = sanitize(data.message);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || !emailRegex.test(email) || !message) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid input' }) };
    }
    console.log('Contact form submission:', { name, email, message });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server error' }) };
  }
};

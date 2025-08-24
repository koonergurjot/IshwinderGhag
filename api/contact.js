const qs = require('querystring');

function sanitize(str){
  return String(str || '').replace(/<[^>]*>?/gm, '').trim();
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  }
  try {
    let data;
    const contentType = event.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      data = JSON.parse(event.body || '{}');
    } else {
      data = qs.parse(event.body || '');
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

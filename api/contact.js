const qs = require('querystring');
const sanitizeHtml = require('sanitize-html');
const sgMail = require('@sendgrid/mail');

const { SENDGRID_API_KEY, CONTACT_RECIPIENT_EMAIL, CONTACT_FROM_EMAIL } = process.env;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

const sanitize = (str) => sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} });

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

    if (!SENDGRID_API_KEY || !CONTACT_RECIPIENT_EMAIL || !CONTACT_FROM_EMAIL) {
      console.error('Missing email configuration. Ensure SENDGRID_API_KEY, CONTACT_RECIPIENT_EMAIL, and CONTACT_FROM_EMAIL are set.');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Email service is not configured.' })
      };
    }

    const recipients = CONTACT_RECIPIENT_EMAIL.split(',').map((addr) => addr.trim()).filter(Boolean);
    const msg = {
      to: recipients,
      from: CONTACT_FROM_EMAIL,
      subject: 'New contact form submission',
      text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>`
    };

    try {
      await sgMail.send(msg);
    } catch (sendError) {
      console.error('Failed to deliver contact form submission.', sendError);
      const providerMessage = sendError?.response?.body?.errors?.map((e) => e.message).join(' ') || sendError.message;
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ success: false, error: `Delivery failed: ${providerMessage || 'Unknown error.'}` })
      };
    }

    console.log('Contact form submission delivered:', { name, email, message });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server error' }) };
  }
};

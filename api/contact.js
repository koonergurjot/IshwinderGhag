const qs = require('querystring');
const sanitizeHtml = require('sanitize-html');
const sgMail = require('@sendgrid/mail');
const fetch = require('node-fetch');
const crypto = require('crypto');

const {
  SENDGRID_API_KEY,
  CONTACT_RECIPIENT_EMAIL,
  CONTACT_FROM_EMAIL,
  CONTACT_REPLY_TO_EMAIL,
  SENDGRID_TEMPLATE_MAP,
  SENDGRID_DEFAULT_TEMPLATE_ID,
  CRM_API_URL,
  CRM_API_KEY,
  LEAD_WEBHOOK_URL,
  MEETING_INTENT_CONFIG,
  CALENDLY_API_TOKEN,
  SAVVYCAL_API_TOKEN,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_TABLE,
  NETLIFY_KV_REST_API_URL,
  NETLIFY_KV_REST_TOKEN,
  NETLIFY_KV_NAMESPACE
} = process.env;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const templateMap = safeJsonParse(SENDGRID_TEMPLATE_MAP) || {};
const meetingConfig = safeJsonParse(MEETING_INTENT_CONFIG) || {};

function safeJsonParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('Failed to parse JSON configuration', { value, error: error.message });
    return null;
  }
}

function sanitizeText(value) {
  if (value == null) return '';
  return sanitizeHtml(String(value), { allowedTags: [], allowedAttributes: {} }).trim();
}

function sanitizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeText(entry)).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = sanitizeText(value);
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => sanitizeText(entry)).filter(Boolean);
      }
    } catch (err) {
      // fall through to split
    }
    return trimmed
      .split(',')
      .map((entry) => sanitizeText(entry))
      .filter(Boolean);
  }
  return [];
}

function sanitizeCalculators(rawCalculators) {
  if (!rawCalculators) return {};
  let source = rawCalculators;
  if (typeof rawCalculators === 'string') {
    try {
      source = JSON.parse(rawCalculators);
    } catch (error) {
      console.warn('Unable to parse calculators payload', error.message);
      return {};
    }
  }
  if (typeof source !== 'object' || Array.isArray(source)) return {};
  return Object.entries(source).reduce((acc, [key, value]) => {
    const cleanKey = sanitizeText(key);
    if (!cleanKey) return acc;
    const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(numericValue)) {
      acc[cleanKey] = numericValue;
    }
    return acc;
  }, {});
}

function buildPayload(data = {}) {
  const sanitized = {
    name: sanitizeText(data.name),
    email: sanitizeText(data.email).toLowerCase(),
    phone: sanitizeText(data.phone),
    message: sanitizeText(data.message),
    intent: sanitizeText(data.intent || data.contextIntent),
    shortlist: sanitizeArray(data.shortlist || data.shortlistIds),
    calculators: sanitizeCalculators(data.calculators || data.calculatorData),
    meta: {}
  };

  const optionalFields = [
    'company',
    'timeline',
    'budget',
    'location',
    'bedrooms',
    'bathrooms',
    'preferredContact',
    'source'
  ];

  optionalFields.forEach((field) => {
    const value = sanitizeText(data[field]);
    if (value) sanitized.meta[field] = value;
  });

  sanitized.createdAt = new Date().toISOString();
  sanitized.shortlist = Array.from(new Set(sanitized.shortlist));
  return sanitized;
}

function validatePayload(payload) {
  if (!payload.name) {
    return 'Name is required';
  }
  if (!payload.email || !emailRegex.test(payload.email)) {
    return 'A valid email is required';
  }
  if (!payload.message) {
    return 'Message is required';
  }
  return null;
}

function getTemplateId(intent) {
  if (intent && templateMap[intent]) return templateMap[intent];
  if (templateMap.default) return templateMap.default;
  return SENDGRID_DEFAULT_TEMPLATE_ID;
}

async function sendEmail(payload, schedulingInfo) {
  if (!SENDGRID_API_KEY || !CONTACT_RECIPIENT_EMAIL || !CONTACT_FROM_EMAIL) {
    throw new Error('Email configuration is incomplete');
  }

  const templateId = getTemplateId(payload.intent);
  if (!templateId) {
    throw new Error('No SendGrid template configured for this intent');
  }

  const recipients = CONTACT_RECIPIENT_EMAIL.split(',')
    .map((addr) => sanitizeText(addr))
    .filter(Boolean);

  if (!recipients.length) {
    throw new Error('No valid recipient configured');
  }

  const msg = {
    to: recipients,
    from: CONTACT_FROM_EMAIL,
    templateId,
    dynamicTemplateData: {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      message: payload.message,
      intent: payload.intent || 'general',
      shortlist: payload.shortlist,
      calculators: payload.calculators,
      meta: payload.meta,
      submitted_at: payload.createdAt,
      scheduling_link: schedulingInfo?.url || null,
      scheduling_label: schedulingInfo?.label || null
    }
  };

  if (CONTACT_REPLY_TO_EMAIL) {
    msg.replyTo = sanitizeText(CONTACT_REPLY_TO_EMAIL);
  }

  await sgMail.send(msg);
}

async function syncCrm(payload) {
  if (!CRM_API_URL) return;
  try {
    const res = await fetch(CRM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CRM_API_KEY ? { Authorization: `Bearer ${CRM_API_KEY}` } : {})
      },
      body: JSON.stringify({
        contact: {
          name: payload.name,
          email: payload.email,
          phone: payload.phone
        },
        intent: payload.intent,
        shortlistIds: payload.shortlist,
        calculators: payload.calculators,
        message: payload.message,
        metadata: payload.meta,
        submittedAt: payload.createdAt
      })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`CRM responded with ${res.status}: ${text}`);
    }
  } catch (error) {
    console.error('CRM sync failed', error);
  }
}

async function postLeadWebhook(payload, schedulingInfo) {
  if (!LEAD_WEBHOOK_URL) return;
  try {
    const lines = [
      `New contact submission`,
      `• Name: ${payload.name}`,
      `• Email: ${payload.email}`,
      payload.phone ? `• Phone: ${payload.phone}` : null,
      payload.intent ? `• Intent: ${payload.intent}` : null,
      payload.shortlist.length ? `• Shortlist: ${payload.shortlist.join(', ')}` : null,
      payload.message ? `• Message: ${payload.message}` : null,
      schedulingInfo?.url ? `• Scheduling: ${schedulingInfo.url}` : null
    ].filter(Boolean);

    await fetch(LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines.join('\n') })
    });
  } catch (error) {
    console.error('Lead webhook failed', error);
  }
}

function sanitizeCtas(ctas) {
  if (!Array.isArray(ctas)) return [];
  return ctas
    .map((cta) => {
      if (!cta || typeof cta !== 'object') return null;
      const label = sanitizeText(cta.label);
      const href = sanitizeText(cta.href);
      if (!label || !href) return null;
      return { label, href };
    })
    .filter(Boolean);
}

async function requestSchedulingLink(intent, payload) {
  const config = intent ? meetingConfig[intent] : null;
  if (!config) {
    return { url: null, label: null, alternateCtas: [] };
  }

  const alternateCtas = sanitizeCtas(config.alternateCtas || []);
  const defaultLabel = sanitizeText(config.label) || 'Schedule time';

  try {
    if (config.provider === 'calendly') {
      if (!CALENDLY_API_TOKEN || !config.eventType) throw new Error('Calendly not configured');
      const res = await fetch('https://api.calendly.com/scheduling_links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CALENDLY_API_TOKEN}`
        },
        body: JSON.stringify({
          event_type: config.eventType,
          max_event_count: 1,
          invitee: {
            email: payload.email,
            name: payload.name
          }
        })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Calendly responded with ${res.status}: ${text}`);
      }
      const json = await res.json();
      const url = json?.resource?.booking_url || json?.resource?.scheduling_url;
      if (url) {
        return { url, label: defaultLabel, alternateCtas };
      }
    } else if (config.provider === 'savvycal') {
      if (!SAVVYCAL_API_TOKEN || !config.link) throw new Error('SavvyCal not configured');
      const res = await fetch(`https://api.savvycal.com/v1/links/${encodeURIComponent(config.link)}/personalized`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SAVVYCAL_API_TOKEN}`
        },
        body: JSON.stringify({
          invitee: {
            name: payload.name,
            email: payload.email
          }
        })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`SavvyCal responded with ${res.status}: ${text}`);
      }
      const json = await res.json();
      const url = json?.data?.url || json?.data?.link || json?.link;
      if (url) {
        return { url, label: defaultLabel, alternateCtas };
      }
    }
  } catch (error) {
    console.error('Scheduling link request failed', error);
  }

  return { url: null, label: defaultLabel, alternateCtas };
}

function buildPersistenceRecord(payload, schedulingInfo) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    intent: payload.intent,
    shortlist: payload.shortlist,
    calculators: payload.calculators,
    message: payload.message,
    metadata: payload.meta,
    scheduling_link: schedulingInfo?.url || null,
    submitted_at: payload.createdAt
  };
}

async function persistSubmission(payload, schedulingInfo) {
  const record = buildPersistenceRecord(payload, schedulingInfo);

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const table = SUPABASE_TABLE || 'contact_submissions';
      const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(record)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Supabase responded with ${res.status}: ${text}`);
      }
      return;
    } catch (error) {
      console.error('Supabase persistence failed', error);
    }
  }

  if (NETLIFY_KV_REST_API_URL && NETLIFY_KV_REST_TOKEN && NETLIFY_KV_NAMESPACE) {
    try {
      const key = `contact:${record.id}`;
      const url = `${NETLIFY_KV_REST_API_URL.replace(/\/$/, '')}/${encodeURIComponent(NETLIFY_KV_NAMESPACE)}/${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${NETLIFY_KV_REST_TOKEN}`
        },
        body: JSON.stringify(record)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Netlify KV responded with ${res.status}: ${text}`);
      }
    } catch (error) {
      console.error('Netlify KV persistence failed', error);
    }
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: baseHeaders };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: baseHeaders,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    };
  }

  try {
    const contentType = event.headers['content-type'] || '';
    const rawBody = event.body || '';
    const decodedBody = event.isBase64Encoded
      ? Buffer.from(rawBody, 'base64').toString('utf8')
      : rawBody;

    const data = contentType.includes('application/json')
      ? JSON.parse(decodedBody || '{}')
      : qs.parse(decodedBody || '');

    const payload = buildPayload(data);
    const validationError = validatePayload(payload);
    if (validationError) {
      return {
        statusCode: 400,
        headers: baseHeaders,
        body: JSON.stringify({ success: false, error: validationError })
      };
    }

    if (!SENDGRID_API_KEY || !CONTACT_RECIPIENT_EMAIL || !CONTACT_FROM_EMAIL) {
      console.error('Missing email configuration. Ensure SENDGRID_API_KEY, CONTACT_RECIPIENT_EMAIL, and CONTACT_FROM_EMAIL are set.');
      return {
        statusCode: 500,
        headers: baseHeaders,
        body: JSON.stringify({ success: false, error: 'Email service is not configured.' })
      };
    }

    const schedulingInfo = await requestSchedulingLink(payload.intent, payload);

    try {
      await sendEmail(payload, schedulingInfo);
    } catch (sendError) {
      console.error('Failed to deliver contact form submission.', sendError);
      const providerMessage = sendError?.response?.body?.errors?.map((e) => e.message).join(' ') || sendError.message;
      return {
        statusCode: 502,
        headers: baseHeaders,
        body: JSON.stringify({ success: false, error: `Delivery failed: ${providerMessage || 'Unknown error.'}` })
      };
    }

    await Promise.allSettled([
      syncCrm(payload),
      postLeadWebhook(payload, schedulingInfo),
      persistSubmission(payload, schedulingInfo)
    ]);

    console.log('Contact form submission delivered:', {
      name: payload.name,
      email: payload.email,
      intent: payload.intent,
      shortlist: payload.shortlist,
      calculators: payload.calculators
    });

    return {
      statusCode: 200,
      headers: baseHeaders,
      body: JSON.stringify({
        success: true,
        intent: payload.intent,
        schedulingLink: schedulingInfo?.url || null,
        schedulingLabel: schedulingInfo?.label || null,
        alternateCtas: schedulingInfo?.alternateCtas || []
      })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: JSON.stringify({ success: false, error: 'Server error' })
    };
  }
};

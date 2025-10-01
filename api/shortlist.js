const fetch = require('node-fetch');
const crypto = require('crypto');

const listings = require('../data/listings.json');

const {
  NETLIFY_KV_REST_API_URL,
  NETLIFY_KV_REST_TOKEN,
  NETLIFY_KV_NAMESPACE,
  SHORTLIST_TTL_SECONDS
} = process.env;

const TTL_SECONDS = Number.parseInt(SHORTLIST_TTL_SECONDS, 10) > 0
  ? Number.parseInt(SHORTLIST_TTL_SECONDS, 10)
  : 60 * 60 * 24 * 7; // default 7 days

const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store'
};

const canonicalMap = new Map();
listings.forEach((entry) => {
  if (entry && entry.id != null) {
    canonicalMap.set(String(entry.id), entry);
  }
});

const memoryStore = new Map();

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: baseHeaders,
    body: JSON.stringify(body)
  };
}

function dedupeIds(ids) {
  const seen = new Set();
  const ordered = [];
  ids.forEach((id) => {
    const key = String(id || '').trim();
    if (!key || seen.has(key)) return;
    if (!canonicalMap.has(key)) {
      throw new Error(`Invalid listing id: ${key}`);
    }
    seen.add(key);
    ordered.push(key);
  });
  return ordered;
}

function sanitizeListings(ids) {
  return ids.map((id) => {
    const canonical = canonicalMap.get(id);
    return {
      id: String(canonical.id),
      title: canonical.title,
      type: canonical.type,
      city: canonical.city,
      price: canonical.price,
      priceDisplay: canonical.priceDisplay || null,
      address: canonical.address || '',
      details: canonical.details || '',
      cover: canonical.cover || '',
      webp: canonical.webp || '',
      gallery: Array.isArray(canonical.gallery) ? canonical.gallery : [],
      url: `/listings/${encodeURIComponent(canonical.id)}/`
    };
  });
}

function createSlug() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function computeExpiry(ttlSeconds) {
  const expires = new Date(Date.now() + ttlSeconds * 1000);
  return expires.toISOString();
}

async function persistRecord(key, value, ttlSeconds) {
  if (NETLIFY_KV_REST_API_URL && NETLIFY_KV_REST_TOKEN && NETLIFY_KV_NAMESPACE) {
    const baseUrl = NETLIFY_KV_REST_API_URL.replace(/\/$/, '');
    const encodedKey = encodeURIComponent(key);
    const namespace = encodeURIComponent(NETLIFY_KV_NAMESPACE);
    const url = `${baseUrl}/${namespace}/${encodedKey}?ttl=${ttlSeconds}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NETLIFY_KV_REST_TOKEN}`
      },
      body: JSON.stringify(value)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`KV store responded with ${res.status}: ${text}`);
    }
    return;
  }

  const expiresAt = Date.now() + ttlSeconds * 1000;
  memoryStore.set(key, { value, expiresAt });
}

async function readRecord(key) {
  if (NETLIFY_KV_REST_API_URL && NETLIFY_KV_REST_TOKEN && NETLIFY_KV_NAMESPACE) {
    const baseUrl = NETLIFY_KV_REST_API_URL.replace(/\/$/, '');
    const encodedKey = encodeURIComponent(key);
    const namespace = encodeURIComponent(NETLIFY_KV_NAMESPACE);
    const url = `${baseUrl}/${namespace}/${encodedKey}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${NETLIFY_KV_REST_TOKEN}`
      }
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`KV store responded with ${res.status}: ${text}`);
    }
    try {
      return await res.json();
    } catch (error) {
      throw new Error(`Failed to parse stored shortlist: ${error.message}`);
    }
  }

  const record = memoryStore.get(key);
  if (!record) return null;
  if (record.expiresAt && record.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return record.value;
}

function extractRequestedIds(data) {
  if (!data) return [];
  if (Array.isArray(data.ids)) {
    return data.ids.map((id) => String(id || '').trim()).filter(Boolean);
  }
  if (Array.isArray(data.listings)) {
    return data.listings
      .map((entry) => (entry && entry.id != null ? String(entry.id).trim() : ''))
      .filter(Boolean);
  }
  return [];
}

async function handlePost(event) {
  let payload;
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch (error) {
    return jsonResponse(400, { success: false, error: 'Invalid JSON payload.' });
  }

  const requested = extractRequestedIds(payload);
  if (!requested.length) {
    return jsonResponse(400, { success: false, error: 'Provide at least one listing id.' });
  }

  if (requested.length > 20) {
    return jsonResponse(400, { success: false, error: 'You can only share up to 20 listings at a time.' });
  }

  let orderedIds;
  try {
    orderedIds = dedupeIds(requested);
  } catch (error) {
    return jsonResponse(400, { success: false, error: error.message });
  }

  if (!orderedIds.length) {
    return jsonResponse(400, { success: false, error: 'No valid listings found to share.' });
  }

  const sanitizedListings = sanitizeListings(orderedIds);
  const slug = createSlug();
  const createdAt = new Date().toISOString();
  const expiresAt = computeExpiry(TTL_SECONDS);

  const record = {
    slug,
    createdAt,
    expiresAt,
    ttlSeconds: TTL_SECONDS,
    listings: sanitizedListings,
    meta: {
      count: sanitizedListings.length,
      ids: orderedIds
    }
  };

  try {
    await persistRecord(`shortlist:${slug}`, record, TTL_SECONDS);
  } catch (error) {
    console.error('Failed to persist shortlist', error);
    return jsonResponse(503, { success: false, error: 'Shortlist sharing is temporarily unavailable.' });
  }

  return jsonResponse(201, {
    success: true,
    slug,
    expiresAt,
    createdAt,
    ttlSeconds: TTL_SECONDS
  });
}

async function handleGet(event) {
  const params = event.queryStringParameters || {};
  const slug = String(params.id || params.slug || '').trim();
  if (!slug) {
    return jsonResponse(400, { success: false, error: 'Missing shortlist id.' });
  }

  let record;
  try {
    record = await readRecord(`shortlist:${slug}`);
  } catch (error) {
    console.error('Failed to read shortlist', error);
    return jsonResponse(503, { success: false, error: 'Unable to retrieve shortlist.' });
  }

  if (!record) {
    return jsonResponse(404, { success: false, error: 'Shortlist not found or has expired.' });
  }

  const { expiresAt, listings: savedListings } = record;
  if (expiresAt && Date.parse(expiresAt) && Date.parse(expiresAt) < Date.now()) {
    return jsonResponse(404, { success: false, error: 'Shortlist not found or has expired.' });
  }

  return jsonResponse(200, {
    slug: record.slug || slug,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    ttlSeconds: record.ttlSeconds || TTL_SECONDS,
    count: Array.isArray(savedListings) ? savedListings.length : 0,
    listings: Array.isArray(savedListings) ? savedListings : []
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: baseHeaders };
  }

  if (event.httpMethod === 'POST') {
    return handlePost(event);
  }

  if (event.httpMethod === 'GET') {
    return handleGet(event);
  }

  return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
};

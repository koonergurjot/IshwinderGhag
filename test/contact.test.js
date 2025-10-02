const assert = require('assert');
const { buildPayload, validatePayload, stripAntiSpamFields } = require('../api/contact');

function runTest(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

const baseData = {
  name: 'Test User',
  email: 'USER@example.com',
  message: 'Hello there!'
};

runTest('buildPayload captures anti-spam fields', () => {
  const payload = buildPayload({ ...baseData, website: '  https://spam.example  ', ttv: ' 2500ms ' });
  assert.strictEqual(payload.honeypot, 'https://spam.example');
  assert.strictEqual(payload.timeToSubmitMs, 2500);
});

runTest('validatePayload rejects submissions with honeypot content', () => {
  const payload = buildPayload({ ...baseData, website: 'bot' });
  const result = validatePayload(payload);
  assert.strictEqual(result, 'Message is required');
});

runTest('validatePayload rejects submissions under minimum time threshold', () => {
  const payload = buildPayload({ ...baseData, ttv: '2999' });
  const result = validatePayload(payload);
  assert.strictEqual(result, 'Message is required');
});

runTest('validatePayload accepts legitimate submissions', () => {
  const payload = buildPayload({ ...baseData, ttv: '3500' });
  const result = validatePayload(payload);
  assert.strictEqual(result, null);
});

runTest('stripAntiSpamFields omits honeypot and time fields', () => {
  const payload = buildPayload({ ...baseData, website: '', ttv: '5000' });
  const safe = stripAntiSpamFields(payload);
  assert.ok(!Object.prototype.hasOwnProperty.call(safe, 'honeypot'));
  assert.ok(!Object.prototype.hasOwnProperty.call(safe, 'timeToSubmitMs'));
});

if (process.exitCode) {
  process.exit(process.exitCode);
}

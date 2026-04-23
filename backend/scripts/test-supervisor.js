/**
 * Quick diagnostic: log in as cfeddx6@gmail.com and call /api/auth/managed-admins
 * Run: node scripts/test-supervisor.js <password>
 */
const http = require('http');

const BASE = 'http://localhost:5000';
const EMAIL = 'cfeddx6@gmail.com';
const PASSWORD = process.argv[2] || '';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  if (!PASSWORD) {
    console.log('Usage: node scripts/test-supervisor.js <password>');
    process.exit(1);
  }

  console.log(`\n1. Logging in as ${EMAIL}...`);
  const loginRes = await request('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
  console.log('   Status:', loginRes.status);
  if (loginRes.status !== 200) {
    console.log('   Body:', JSON.stringify(loginRes.body, null, 2));
    process.exit(1);
  }
  const token = loginRes.body.token;
  const user = loginRes.body;
  console.log('   Role:', user.role);
  console.log('   Permissions:', JSON.stringify(user.permissions));
  console.log('   Token:', token ? '✅ received' : '❌ missing');

  console.log('\n2. GET /api/auth/managed-admins...');
  const adminsRes = await request('GET', '/api/auth/managed-admins', null, token);
  console.log('   Status:', adminsRes.status);
  console.log('   Body:', JSON.stringify(adminsRes.body, null, 2));

  console.log('\n3. GET /api/activity-logs...');
  const logsRes = await request('GET', '/api/activity-logs', null, token);
  console.log('   Status:', logsRes.status);
  console.log('   Body:', JSON.stringify(logsRes.body, null, 2));
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

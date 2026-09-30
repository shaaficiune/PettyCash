const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('backend/.env is required before rotating JWT secrets.');
  process.exit(1);
}

const contents = fs.readFileSync(envPath, 'utf8');
const parsed = dotenv.parse(contents);
const accessSecret = parsed.JWT_SECRET;
const refreshSecret = parsed.JWT_REFRESH_SECRET;

if (accessSecret?.length >= 64 && refreshSecret?.length >= 64 && accessSecret !== refreshSecret) {
  fs.chmodSync(envPath, 0o600);
  console.log('JWT secrets meet the required length and are distinct.');
  process.exit(0);
}

const eol = contents.includes('\r\n') ? '\r\n' : '\n';
let lines = contents.split(/\r?\n/);
const replacements = {
  JWT_SECRET: randomBytes(64).toString('hex'),
  JWT_REFRESH_SECRET: randomBytes(64).toString('hex'),
};

for (const [key, value] of Object.entries(replacements)) {
  const keyLine = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`);
  let found = false;
  lines = lines.map((line) => {
    if (!keyLine.test(line)) return line;
    found = true;
    return `${key}=${value}`;
  });
  if (!found) lines.push(`${key}=${value}`);
}

fs.writeFileSync(envPath, lines.join(eol), { mode: 0o600 });
fs.chmodSync(envPath, 0o600);
console.log('Rotated weak or shared JWT secrets. Existing sessions must sign in again.');

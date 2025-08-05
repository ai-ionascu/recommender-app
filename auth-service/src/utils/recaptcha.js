// src/utils/recaptcha.js
import 'dotenv/config';

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export async function verifyRecaptcha(token, remoteIp) {
  // Permite dezactivare în dev
  if (String(process.env.CAPTCHA_ENABLED).toLowerCase() === 'false') {
    return { success: true, skipped: true };
  }

  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    throw new Error('Missing RECAPTCHA_SECRET');
  }

  if (!token) {
    return { success: false, 'error-codes': ['missing-input-response'] };
  }

  const body = new URLSearchParams();
  body.append('secret', secret);
  body.append('response', token);
  if (remoteIp) body.append('remoteip', remoteIp);

  const resp = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!resp.ok) {
    return { success: false, 'error-codes': [`http_${resp.status}`] };
  }

  const data = await resp.json();
  return data; // { success: boolean, challenge_ts, hostname, 'error-codes': [] }
}

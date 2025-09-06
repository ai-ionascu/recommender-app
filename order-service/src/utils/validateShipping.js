export function validateShipping(payload = {}) {
  const required = ['name','phone','address1','city','zip','country'];
  const missing = required.filter(k => !payload[k] || String(payload[k]).trim() === '');
  if (missing.length) {
    const err = new Error(`Missing required shipping fields: ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }
  return {
    name: String(payload.name).trim(),
    phone: String(payload.phone).trim(),
    address1: String(payload.address1).trim(),
    address2: payload.address2 ? String(payload.address2).trim() : '',
    city: String(payload.city).trim(),
    zip: String(payload.zip).trim(),
    country: String(payload.country).trim(),
  };
}
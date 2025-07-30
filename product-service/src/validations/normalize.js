// src/validations/normalize.js
export function normalizeBody(data = {}) {
  const out = {};
  for (const k in data) {
    out[k] = data[k] === '' ? undefined : data[k];
  }
  return out;
}

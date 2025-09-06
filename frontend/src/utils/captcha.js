export const CAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

export function isCaptchaEnabled() {
  // Enable only if we actually have a site key AND backend isn't explicitly off,
  // but we can't read backend env here; so we only check site key.
  return Boolean(CAPTCHA_SITE_KEY);
}

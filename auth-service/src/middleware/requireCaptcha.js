// src/middleware/requireCaptcha.js
import { verifyRecaptcha } from '../utils/recaptcha.js';

export const requireCaptcha = async (req, res, next) => {
  try {
    if (String(process.env.CAPTCHA_ENABLED).toLowerCase() === 'false') {
      return next();
    }

    const captchaToken = req.body?.captchaToken;
    if (!captchaToken) {
      return res.status(400).json({ message: 'captchaToken is required.' });
    }

    const result = await verifyRecaptcha(captchaToken, req.ip);

    if (!result?.success) {
      return res.status(403).json({
        message: 'Captcha verification failed.',
        errors: result?.['error-codes'] || []
      });
    }

    next();
  } catch (err) {
    console.error('[requireCaptcha] Error:', err.message);
    res.status(500).json({ message: 'Captcha verification error.' });
  }
};

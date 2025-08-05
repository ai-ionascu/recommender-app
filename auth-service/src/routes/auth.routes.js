import express from 'express';
import { login, signup, getProfile } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { verifyEmail } from '../controllers/auth.controller.js';
import { logout } from '../controllers/auth.controller.js';
import { requestPasswordReset, changePassword } from '../controllers/auth.controller.js';
import { changeEmail, confirmEmailChange } from '../controllers/auth.controller.js';
import { requireCaptcha } from '../middleware/requireCaptcha.js';

const router = express.Router();

// POST /auth/signup
router.post('/signup', requireCaptcha, signup);

// POST /auth/login
router.post('/login', requireCaptcha, login);

// logged in users only
router.get('/profile', requireAuth, getProfile, (req, res) => {
  res.json({ message: `Welcome, ${req.user.email}` });
});

// admins only
router.get('/admin/panel', requireAuth, requireRole(['admin']), (req, res) => {
  res.status(200).json({ message: `Welcome to the admin panel, ${req.user.email}` });
});

router.get('/verify', verifyEmail);

router.post('/logout', requireAuth, logout);

router.post('/request-password-reset', requireAuth, requestPasswordReset);
router.post('/change-password', requireAuth, changePassword);

router.put('/change-email', requireAuth, changeEmail);
router.get('/confirm-email-change', confirmEmailChange);

export default router;

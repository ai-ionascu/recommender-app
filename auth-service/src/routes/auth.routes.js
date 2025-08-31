import express from 'express';
import { login, signup, getProfile } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { verifyEmail } from '../controllers/auth.controller.js';
import { logout } from '../controllers/auth.controller.js';
import { requestPasswordReset, changePassword } from '../controllers/auth.controller.js';
import { changeEmail, confirmEmailChange } from '../controllers/auth.controller.js';
import { requireCaptcha } from '../middleware/requireCaptcha.js';
import { adminList, adminUpdate, adminDelete } from '../controllers/auth.controller.js';

const router = express.Router();

// POST /auth/signup
router.post('/signup', requireCaptcha, signup);

// POST /auth/login
router.post('/login', requireCaptcha, login);

// logged in users only
router.get('/profile', requireAuth, getProfile);

// admins only
router.get('/admin/products', requireAuth, requireRole(['admin']), (req, res) => {
  res.status(200).json({ message: `Welcome to the admin products page, ${req.user.email}` });
});

// LIST users
router.get('/admin/users', requireAuth, requireRole(['admin']), adminList);
// UPDATE user (role / verified)
router.put('/admin/users/:id', requireAuth, requireRole(['admin']), adminUpdate);
// DELETE user
router.delete('/admin/users/:id', requireAuth, requireRole(['admin']), adminDelete);

router.get('/verify', verifyEmail);
router.post('/logout', requireAuth, logout);
router.post('/request-password-reset', requireAuth, requestPasswordReset);
router.post('/change-password', requireAuth, changePassword);
router.put('/change-email', requireAuth, changeEmail);
router.get('/confirm-email-change', confirmEmailChange);

export default router;

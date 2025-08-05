import * as authService from '../services/auth.service.js';
import { findByToken, deleteToken } from '../models/emailVerification.model.js';
import { markUserAsVerified } from '../models/user.model.js';

export const signup = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await authService.signup({ email, password, role });

    res.status(201).json({
      message: 'User registered successfully. Please verify your email.',
      user,
    });
  } catch (err) {
    console.error('[auth.controller] Signup error:', err.message);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const { token, user } = await authService.login({ email, password });

    res.status(200).json({
      message: 'Login successful.',
      token,
      user,
    });
  } catch (err) {
    console.error('[auth.controller] Login error:', err.message);
    res.status(err.status || 500).json({
      message: err.message || 'Internal server error.',
    });
  }
};

export const getProfile = (req, res) => {
  const { id, email, role, is_verified } = req.user;

  res.status(200).json({
    id,
    email,
    role,
    is_verified,
  });
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Missing token.' });

    const record = await findByToken(token);
    if (!record) return res.status(400).json({ message: 'Invalid or expired token.' });

    if (new Date() > new Date(record.expires_at)) {
      await deleteToken(token);
      return res.status(400).json({ message: 'Token expired.' });
    }

    await markUserAsVerified(record.user_id);
    await deleteToken(token);

    res.status(200).json({ message: 'Email verified successfully.' });

  } catch (err) {
    console.error('[auth.controller] Email verification error:', err.message);
    res.status(400).json({ message: 'Invalid or expired token.' });
  }
};

export const logout = (req, res) => {
  // deleting the  token is enough
  res.status(200).json({ message: 'Logged out successfully.' });
};

export const requestPasswordReset = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await authService.requestPasswordReset(user.email);
    res.status(200).json({ message: 'If the email exists, a reset link was sent.' });
  } catch (err) {
    console.error('[requestPasswordReset]', err.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { token, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!token || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    await authService.changePassword(token, userId, currentPassword, newPassword);
    res.status(200).json({ message: 'Password reset successful.' });
  } catch (err) {
    console.error('[changePassword]', err.message);
    res.status(400).json({ message: err.message });
  }
};

export const changeEmail = async (req, res) => {
  try {
    const user = req.user;
    const { currentPassword, newEmail } = req.body;

    if (!currentPassword || !newEmail) {
      return res.status(400).json({ message: 'Current password and new email are required.' });
    }

    await authService.requestEmailChange(user.id, currentPassword, newEmail);
    res.status(200).json({ message: 'A confirmation email has been sent to your new address.' });
  } catch (err) {
    console.error('[changeEmail]', err.message);
    res.status(400).json({ message: err.message });
  }
};

export const confirmEmailChange = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Token is required.' });
    }

    await authService.confirmEmailChange(token);
    res.status(200).json({ message: 'Email changed successfully.' });
  } catch (err) {
    console.error('[confirmEmailChange]', err.message);
    res.status(400).json({ message: err.message });
  }
};


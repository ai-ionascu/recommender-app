import pool from '../config/db.js';
import { findUserByEmail, findUserById } from '../models/user.model.js';
import { hashPassword, comparePasswords } from '../utils/hash.js';
import { generateToken } from '../utils/jwt.js';
import { sendEmail } from '../utils/mailer.js';
import { createVerificationToken } from '../models/emailVerification.model.js';
import crypto from 'crypto';
import { createPasswordResetToken, findResetToken, deleteResetToken } from '../models/passwordReset.model.js';
import { createEmailChangeToken, findEmailChangeToken, deleteEmailChangeToken } from '../models/emailChange.model.js';


export const signup = async ({ email, password, role = 'user' }) => {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    const error = new Error('Email already registered');
    error.status = 409;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await hashPassword(password);
    const userResult = await client.query(`
      INSERT INTO users (email, password_hash, role, is_verified)
      VALUES ($1, $2, $3, false)
      RETURNING id, email, role, is_verified, created_at
    `, [email, passwordHash, role]);

    const user = userResult.rows[0];

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h

    await createVerificationToken(user.id, token, expiresAt, client);

    const verificationLink = `http://localhost:4000/auth/verify?token=${token}`;
    const html = `
      <h3>Verify your email</h3>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationLink}">${verificationLink}</a>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Verify your Wine Store account',
      html,
    });

    await client.query('COMMIT');
    return user;

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[auth.service] Signup failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

export const login = async ({ email, password }) => {
  const user = await findUserByEmail(email);
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  if (!user.is_verified) {
    const error = new Error('Please verify your email before logging in.');
    error.status = 403;
    throw error;
  }

  const passwordMatch = await comparePasswords(password, user.password_hash);
  if (!passwordMatch) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
    },
  };
};

export async function requestPasswordReset(email) {

  const user = await findUserByEmail(email);
  console.log('[requestPasswordReset] found user:', user?.id || 'N/A');
  if (!user) {
    throw new Error('User not found');
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h
  await createPasswordResetToken(user.id, token, expiresAt);

  const resetLink = `http://localhost:3000/change-password?token=${token}`; // URL frontend
  const html = `
    <h3>Reset Your Password</h3>
    <p>Click the link below to reset your password:</p>
    <a href="${resetLink}">${resetLink}</a>
  `;
  
  await sendEmail({
      to: user.email,
      subject: 'Reset your Wine Store password',
      html,
    });

  console.log('[requestPasswordReset] token created:', token);
}

export async function changePassword(token, userId, currentPassword, newPassword) {
  const record = await findResetToken(token);
  console.log('[changePassword] record.user_id:', record?.user_id);
  console.log('[changePassword] req.user.id:', userId);
  if (!record || new Date() > new Date(record.expires_at)) {
    throw new Error('Invalid or expired token');
  }

  if (record.user_id !== userId) {
    throw new Error('Token does not belong to the authenticated user');
  }

  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = result.rows[0];
  if (!user) throw new Error('User not found');

  const isMatch = await comparePasswords(currentPassword, user.password_hash);
  if (!isMatch) {
    throw new Error('Current password is incorrect');
  }

  const passwordHash = await hashPassword(newPassword);
  await pool.query(`
  UPDATE users 
  SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
  WHERE id = $2`, [passwordHash, userId]);

  await deleteResetToken(token);
}

export async function requestEmailChange(userId, currentPassword, newEmail) {
  const user = await findUserById(userId);
  if (!user) throw new Error('User not found.');

  const passwordMatch = await comparePasswords(currentPassword, user.password_hash);
  if (!passwordMatch) throw new Error('Current password is incorrect.');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h

  await createEmailChangeToken(userId, newEmail, token, expiresAt);

  const verificationLink = `http://localhost:4000/auth/confirm-email-change?token=${token}`;
  const html = `
    <h3>Confirm your new email</h3>
    <p>Click the link below to confirm your email change:</p>
    <a href="${verificationLink}">${verificationLink}</a>
  `;

  await sendEmail({
    to: newEmail,
    subject: 'Confirm your new email address',
    html,
  });
}

export async function confirmEmailChange(token) {
  const record = await findEmailChangeToken(token);
  if (!record || new Date() > new Date(record.expires_at)) {
    throw new Error('Invalid or expired token.');
  }

  await pool.query(
    `UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [record.new_email, record.user_id]
  );

  await deleteEmailChangeToken(token);
}

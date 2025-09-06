import pool from '../config/db.js';
import { findUserByEmail, findUserById } from '../models/user.model.js';
import { hashPassword, comparePasswords } from '../utils/hash.js';
import { generateToken } from '../utils/jwt.js';
import { sendEmail, sendEmailVerification, buildVerifyLink } from '../utils/mailer.js';
import { createVerificationToken } from '../models/emailVerification.model.js';
import crypto from 'crypto';
import { createPasswordResetToken, findResetToken, deleteResetToken } from '../models/passwordReset.model.js';
import { createEmailChangeToken, findEmailChangeToken, deleteEmailChangeToken } from '../models/emailChange.model.js';

const PUBLIC_FRONTEND = (
  process.env.FRONTEND_PUBLIC_URL ||
  process.env.CLIENT_BASE_URL ||
  process.env.FRONTEND_PUBLIC_ORIGIN ||
  'http://localhost:8080'
).replace(/\/+$/, '');

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

    const tokenRaw = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h

    await createVerificationToken(user.id, tokenRaw, expiresAt, client);
    await sendEmailVerification({
      to: user.email,
      tokenRaw,
      baseUrl: PUBLIC_FRONTEND,
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
  if (!user) return; // soft-fail

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  await createPasswordResetToken(user.id, token, expiresAt);

  const resetLink = `${PUBLIC_FRONTEND}/auth/reset?token=${encodeURIComponent(token)}`;

  const html = `
    <h3>Reset your password</h3>
    <p>Click the link below to set a new password:</p>
    <a href="${resetLink}">${resetLink}</a>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Reset your password',
    html,
  });
}

/**
 * PROTECTED: change password pentru user logat (fluxul existent)
 */
export async function changePassword(token, userId, currentPassword, newPassword) {
  const record = await findResetToken(token);
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
  if (!isMatch) throw new Error('Current password is incorrect');

  const passwordHash = await hashPassword(newPassword);
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, userId]
  );
  await deleteResetToken(token);
}

/**
 * PUBLIC: reset password by token (fără login, fără parola curentă)
 */
export async function resetPasswordWithToken(token, newPassword) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Read token atomically from the same connection
    const tokRes = await client.query(
      `SELECT user_id, expires_at
         FROM password_reset_tokens
        WHERE token = $1
        LIMIT 1`,
      [token]
    );
    if (tokRes.rowCount === 0) {
      throw new Error('Invalid or expired token');
    }
    const rec = tokRes.rows[0];
    if (new Date() > new Date(rec.expires_at)) {
      // cleanup expired token and report
      await client.query(
        'DELETE FROM password_reset_tokens WHERE token = $1',
        [token]
      );
      throw new Error('Invalid or expired token');
    }

    // Optional: verify user is present and fetch current hash (good for logs)
    const usrRes = await client.query(
      `SELECT id, password_hash
         FROM users
        WHERE id = $1::uuid
        LIMIT 1`,
      [rec.user_id]
    );
    if (usrRes.rowCount === 0) {
      throw new Error('User not found');
    }

    const passwordHash = await hashPassword(newPassword);

    // The important bit: cast id to uuid on the WHERE to avoid type ambiguity
    const updRes = await client.query(
      `UPDATE users
          SET password_hash = $1,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $2::uuid
        RETURNING id`,
      [passwordHash, rec.user_id]
    );

    if (updRes.rowCount !== 1) {
      console.warn('[resetPasswordWithToken] UPDATE affected 0 rows', {
        tokenEndsWith: token?.slice(-6),
        user_id: rec.user_id,
      });
      throw new Error('Password not updated');
    }

    // Delete token after successful update
    await client.query(
      'DELETE FROM password_reset_tokens WHERE token = $1',
      [token]
    );

    await client.query('COMMIT');
    console.info('[resetPasswordWithToken] OK', {
      user_id: updRes.rows[0].id,
    });
    return { userId: updRes.rows[0].id };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[resetPasswordWithToken] FAIL', err?.message);
    throw err;
  } finally {
    client.release();
  }
}

export async function requestEmailChange(userId, currentPassword, newEmail) {
  const user = await findUserById(userId);
  if (!user) throw new Error('User not found.');

  const passwordMatch = await comparePasswords(currentPassword, user.password_hash);
  if (!passwordMatch) throw new Error('Current password is incorrect.');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h

  await createEmailChangeToken(userId, newEmail, token, expiresAt);

  const verificationLink = `${PUBLIC_FRONTEND}/confirm-email-change?token=${encodeURIComponent(token)}`;
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
    'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [record.new_email, record.user_id]
  );

  await deleteEmailChangeToken(token);
}

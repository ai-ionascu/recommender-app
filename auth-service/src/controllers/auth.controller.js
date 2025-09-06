import * as authService from "../services/auth.service.js";
import { createVerificationToken, findByToken, deleteToken, findActiveToken } from "../models/emailVerification.model.js";
import {
  markUserAsVerified,
  findUserById,
  listUsers,
  updateUserRole,
  deleteUserById,
  findUserByEmail
} from "../models/user.model.js";
import crypto from "crypto";
import { sendEmailVerification } from "../utils/mailer.js";

//  Public: signup / login / verify

export const signup = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
    const user = await authService.signup({ email, password, role });
    res.status(201).json({ message: "User registered successfully. Please verify your email.", user });
  } catch (err) {
    console.error("[auth.controller] Signup error:", err.message);
    res.status(err.status || 500).json({ message: err.message || "Internal server error." });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
    const { token, user } = await authService.login({ email, password });
    res.status(200).json({ message: "Login successful.", token, user });
  } catch (err) {
    console.error("[auth.controller] Login error:", err.message);
    res.status(err.status || 500).json({ message: err.message || "Internal server error." });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const raw = (req.query?.token || req.params?.token || "").toString().trim();
    if (!raw) return res.status(400).json({ message: "Missing token" });
    const token = decodeURIComponent(raw);

    const rec = await findByToken(token);
    if (!rec) return res.status(400).json({ message: "Invalid or expired token" });

    if (rec.expires_at && new Date(rec.expires_at) < new Date()) {
      await deleteToken(token).catch(() => {});
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const upd = await markUserAsVerified(rec.user_id);
    if (!upd) return res.status(500).json({ message: "Failed to verify user" });

    await deleteToken(token).catch(() => {});

    return res.status(200).json({ message: "Email verified" });
  } catch (err) {
    console.error("[auth.verifyEmail] failed:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

//  Profile / logout

export const getProfile = async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const u = await findUserById(userId);
  if (!u) return res.status(404).json({ message: "Not found" });

  const { id, email, role, is_verified } = u;
  return res.status(200).json({ id, email, role, roles: [role], is_verified });
};

export const logout = (_req, res) => {
  res.status(200).json({ message: "Logged out successfully." });
};

//  Forgot / reset password

export const requestPasswordReset = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) return res.status(200).json({ message: "If the email exists, a reset link was sent." });

    try {
      await authService.requestPasswordReset(email);
    } catch (e) {
      console.warn("[requestPasswordReset] soft-fail:", e?.message);
    }
    return res.status(200).json({ message: "If the email exists, a reset link was sent." });
  } catch (err) {
    console.error("[requestPasswordReset] hard error:", err);
    return res.status(200).json({ message: "If the email exists, a reset link was sent." });
  }
};

export const resetPasswordPublic = async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and newPassword are required." });
    }
    await authService.resetPasswordWithToken(token, newPassword);
    return res.status(200).json({ message: "Password reset successful." });
  } catch (err) {
    console.error("[resetPasswordPublic]", err?.message || err);
    return res.status(400).json({ message: err?.message || "Invalid or expired token." });
  }
};

// Logged-in flows (current-password)

export const changePassword = async (req, res) => {
  try {
    const { token, currentPassword, newPassword } = req.body || {};
    const userId = req.user?.id;

    if (!token || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }
    await authService.changePassword(token, userId, currentPassword, newPassword);
    res.status(200).json({ message: "Password reset successful." });
  } catch (err) {
    console.error("[changePassword]", err.message);
    res.status(400).json({ message: err.message });
  }
};

//  Email change

export const changeEmail = async (req, res) => {
  try {
    const user = req.user;
    const { currentPassword, newEmail } = req.body || {};
    if (!currentPassword || !newEmail) {
      return res.status(400).json({ message: "Current password and new email are required." });
    }
    await authService.requestEmailChange(user.id, currentPassword, newEmail);
    res.status(200).json({ message: "A confirmation email has been sent to your new address." });
  } catch (err) {
    console.error("[changeEmail]", err.message);
    res.status(400).json({ message: err.message });
  }
};

export const confirmEmailChange = async (req, res) => {
  try {
    const { token } = req.query || {};
    if (!token) return res.status(400).json({ message: "Token is required." });
    await authService.confirmEmailChange(token);
    res.status(200).json({ message: "Email changed successfully." });
  } catch (err) {
    console.error("[confirmEmailChange]", err.message);
    res.status(400).json({ message: err.message });
  }
};

// Admin

export const adminList = async (_req, res) => {
  try {
    const users = await listUsers();
    res.status(200).json({ users });
  } catch (err) {
    console.error("[auth.controller] adminList error:", err.message);
    res.status(500).json({ message: "Failed to list users" });
  }
};

export const adminUpdate = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid user id" });
    const { role, is_verified } = req.body || {};
    const updated = await updateUserRole(id, { role, is_verified });
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({ user: updated });
  } catch (err) {
    console.error("[auth.controller] adminUpdate error:", err.message);
    res.status(err.status || 500).json({ message: err.message || "Internal server error." });
  }
};

export const adminDelete = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid user id" });
    await deleteUserById(id);
    res.status(204).end();
  } catch (err) {
    console.error("[auth.controller] adminDelete error:", err.message);
    res.status(err.status || 500).json({ message: err.message || "Internal server error." });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await findUserByEmail(email);
    if (!user) return res.json({ message: "If an account exists, an email was sent." });
    if (user.is_verified) return res.json({ message: "Account already verified." });

    // reuse active token if exists
    const active = await findActiveToken(user.id);
    let tokenRaw = active?.token;

    // otherwise create new token
    if (!tokenRaw) {
      tokenRaw = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await createVerificationToken(user.id, tokenRaw, expiresAt);
    }

    const base = (
      process.env.FRONTEND_PUBLIC_URL ||
      process.env.CLIENT_BASE_URL ||
      process.env.FRONTEND_PUBLIC_ORIGIN ||
      "http://localhost:8080"
    ).replace(/\/+$/, "");

    await sendEmailVerification({ to: user.email, tokenRaw, baseUrl: base });
    return res.json({ message: "If an account exists, an email was sent." });
  } catch (err) {
    console.error("[auth.resendVerificationEmail]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

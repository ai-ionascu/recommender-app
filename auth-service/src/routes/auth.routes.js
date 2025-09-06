import express from "express";
import {
  signup,
  login,
  getProfile,
  verifyEmail,
  resendVerificationEmail,
  logout,
  requestPasswordReset,
  resetPasswordPublic,
  changePassword,
  changeEmail,
  confirmEmailChange,
  adminList,
  adminUpdate,
  adminDelete,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { requireCaptcha } from "../middleware/requireCaptcha.js";

const router = express.Router();

//  Public auth
router.post("/signup", requireCaptcha, signup);
router.post("/login",  requireCaptcha, login);
router.get("/verify",  verifyEmail);
router.get("/verify/:token",  verifyEmail);
router.post("/verify/resend", resendVerificationEmail);

//  Password reset (public)
router.post("/password/reset/request", requestPasswordReset);
router.post("/password/reset/confirm", resetPasswordPublic);

//  Profile / session (auth)
router.get("/profile", requireAuth, getProfile);
router.post("/logout", requireAuth, logout);

//  Password & email changes (auth)
router.put("/change-password", requireAuth, changePassword);
router.put("/change-email", requireAuth, changeEmail);
router.get("/confirm-email-change", confirmEmailChange);

//  Admin
router.get("/admin/users",        requireAuth, requireRole(["admin"]), adminList);
router.put("/admin/users/:id",    requireAuth, requireRole(["admin"]), adminUpdate);
router.delete("/admin/users/:id", requireAuth, requireRole(["admin"]), adminDelete);

export default router;

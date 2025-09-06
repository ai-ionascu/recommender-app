// frontend/src/api/auth.js
import { authHttp, publicAuthHttp } from "@/api/http";

/** Signup / Login (public) */
export async function signup({ email, password, captchaToken, role }) {
  const payload = { email, password, role, captchaToken };
  const { data } = await publicAuthHttp.post("/signup", payload);
  return data;
}

export async function login({ email, password, captchaToken }) {
  const payload = { email, password, captchaToken };
  const { data } = await publicAuthHttp.post("/login", payload);
  return data;
}

/** Email verification (public GET /auth/verify?token=...) */
export async function verifyEmail(token) {
  const { data } = await publicAuthHttp.get("/verify", { params: { token } });
  return data;
}

/** Forgot password — send reset link (PUBLIC). */
export async function requestPasswordReset(email) {
  try {
    const { data } = await publicAuthHttp.post("/password/reset/request", { email });
    return data;
  } catch {
    // fallback to legacy if needed
    const { data } = await publicAuthHttp.post("/request-password-reset", { email });
    return data;
  }
}

/** Reset password with token (PUBLIC). */
export async function resetPasswordWithToken({ token, newPassword }) {
  try {
    const { data } = await publicAuthHttp.post("/password/reset/confirm", {
      token,
      newPassword,
    });
    return data;
  } catch (e1) {
    try {
      const { data } = await publicAuthHttp.post("/password/reset", { token, newPassword });
      return data;
    } catch (e2) {
      const msg =
        e2?.response?.data?.message ||
        e1?.response?.data?.message ||
        "Reset endpoint unavailable. Please use the link from the email again or contact support.";
      const err = new Error(msg);
      err.response = e2?.response || e1?.response;
      throw err;
    }
  }
}

/** Optional: logout (authenticated) */
export async function logout() {
  const { data } = await authHttp.post("/logout");
  return data;
}

/** Profile (authenticated) */
export async function getProfile() {
  const { data } = await authHttp.get("/profile");
  return data;
}

export async function resendVerificationEmail(email) {
  const { data } = await publicAuthHttp.post("/verify/resend", { email });
  return data;
}

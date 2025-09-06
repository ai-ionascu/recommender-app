import { useMemo, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";

/**
 * Small helper around react-google-recaptcha.
 * - If captcha is disabled via env, it just calls onVerify(null).
 * - Otherwise it renders an invisible captcha and exposes execute().
 */
export default function CaptchaGate({ onVerify }) {
  const enabled = useMemo(
    () => String(import.meta.env.VITE_CAPTCHA_ENABLED ?? "false").toLowerCase() === "true",
    []
  );
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  const ref = useRef(null);

  const execute = async () => {
    if (!enabled) {
      onVerify?.(null);
      return;
    }
    if (!ref.current) return;
    const token = await ref.current.executeAsync();
    ref.current.reset();
    onVerify?.(token);
  };

  // Expose imperative method to parents
  // Usage: captchaRef.current()
  // eslint-disable-next-line react/display-name
  const ImperativeHandle = (_, __) => null; // noop

  return enabled ? (
    <ReCAPTCHA
      ref={ref}
      size="invisible"
      sitekey={siteKey}
      onChange={(token) => onVerify?.(token)}
    />
  ) : (
    <ImperativeHandle />
  );
}

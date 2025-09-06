import { useEffect, useRef, useState } from "react";

export default function useRecaptchaV2(siteKey) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey) return;

    const ensureScript = () =>
      new Promise((resolve) => {
        let s = document.getElementById("recaptcha-v2");
        if (s && window.grecaptcha) return resolve();
        if (!s) {
          s = document.createElement("script");
          s.id = "recaptcha-v2";
          s.src = "https://www.google.com/recaptcha/api.js?render=explicit";
          s.async = true;
          s.defer = true;
          document.body.appendChild(s);
        }
        s.addEventListener("load", () => resolve());
      });

    ensureScript().then(() => {
      const tryRender = () => {
        if (!window.grecaptcha || !containerRef.current || widgetIdRef.current !== null) {
          return;
        }
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (t) => setToken(t),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
        setLoaded(true);
      };

      if (window.grecaptcha && window.grecaptcha.render) {
        tryRender();
      } else {
        // fallback in case the API loads a bit later
        const id = setInterval(() => {
          tryRender();
          if (widgetIdRef.current !== null) clearInterval(id);
        }, 50);
      }
    });
  }, [siteKey]);

  const reset = () => {
    try {
      if (window.grecaptcha && widgetIdRef.current !== null) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
    } catch {
      /* noop */
    }
    setToken("");
  };

  return { containerRef, loaded, token, reset };
}

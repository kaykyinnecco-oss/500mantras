(() => {
  "use strict";

  const config = window.LANDING_CONFIG || {};
  const body = document.body;
  const query = new URLSearchParams(window.location.search);
  const requestedVariant = query.get("lp_variant");
  const variants = config.experiment?.variants || {};
  const isExplicitExperimentVariant = config.experiment?.enabled === true
    && Boolean(requestedVariant)
    && Object.prototype.hasOwnProperty.call(variants, requestedVariant);
  const variant = isExplicitExperimentVariant ? requestedVariant : "control";
  const experimentId = config.experiment?.id || "mantras-2026";
  body.dataset.experimentVariant = variant;

  const revealItems = document.querySelectorAll(".reveal");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (revealItems.length && "IntersectionObserver" in window && !prefersReducedMotion) {
    body.classList.add("reveal-ready");
    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -36px 0px", threshold: 0.08 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const variantCopy = variants[variant] || {};
  document.querySelectorAll("[data-copy-slot]").forEach((element) => {
    const value = variantCopy[element.dataset.copySlot];
    if (typeof value === "string") element.textContent = value;
  });

  const safeCheckout = (() => {
    try {
      const checkout = new URL(config.checkoutUrl);
      const officialDomain = checkout.hostname === "cakto.com.br" || checkout.hostname.endsWith(".cakto.com.br");
      return checkout.protocol === "https:" && officialDomain ? checkout : null;
    } catch {
      return null;
    }
  })();

  const campaignKeys = ["src", "sck", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  function checkoutHref() {
    if (!safeCheckout) return "";
    const target = new URL(safeCheckout.toString());
    for (const key of campaignKeys) {
      const value = query.get(key);
      if (value && !target.searchParams.has(key)) target.searchParams.set(key, value);
    }
    if (isExplicitExperimentVariant) {
      const previous = target.searchParams.get("utm_content") || "";
      const suffix = "lp500-" + experimentId + "-" + variant;
      if (!previous.includes(suffix)) target.searchParams.set("utm_content", previous ? previous + "|" + suffix : suffix);
    }
    return target.toString();
  }

  document.querySelectorAll("a[data-checkout]").forEach((link) => {
    if (safeCheckout) {
      link.href = checkoutHref();
      link.removeAttribute("aria-disabled");
      return;
    }
    link.href = "#";
    link.setAttribute("aria-disabled", "true");
    link.tabIndex = -1;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.alert("Checkout ainda não configurado. Informe NEXT_PUBLIC_CAKTO_CHECKOUT_URL antes de publicar.");
    });
  });

  let analyticsAllowed = false;
  let analyticsInitialized = false;
  const consentKey = "mantras.analytics.consent.v2";
  const legacyConsentKey = "mantras.analytics.consent.v1";
  const consentLifetime = 180 * 24 * 60 * 60 * 1000;
  const consentDialog = document.getElementById("consentPreferences");
  let consentExpiryTimer;
  let offerViewed = false;
  let offerInView = false;
  let offerObserver;

  function readConsent() {
    try {
      const record = JSON.parse(window.localStorage.getItem(consentKey));
      const now = Date.now();
      if (record?.version === 2 && ["accepted", "denied"].includes(record.status)
        && Number.isFinite(record.updatedAt) && Number.isFinite(record.expiresAt)
        && record.updatedAt <= now && record.expiresAt > now
        && record.expiresAt - record.updatedAt <= consentLifetime) return record;
      // An old acceptance has no timestamp or expiry, so it cannot enable tracking.
      if (window.localStorage.getItem(legacyConsentKey) === "denied") return { status: "denied" };
    } catch { /* Missing, malformed or inaccessible storage never authorizes tracking. */ }
    return null;
  }

  let consentRecord = readConsent();
  const gaConsentSettings = (analyticsStorage) => ({
    analytics_storage: analyticsStorage,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  function updateLoadedAnalyticsConsent(allowed) {
    if (typeof window.fbq === "function") window.fbq("consent", allowed ? "grant" : "revoke");
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", gaConsentSettings(allowed ? "granted" : "denied"));
    }
  }

  function clearOptionalCookies() {
    const domains = window.location.hostname.split(".");
    const paths = ["/", window.location.pathname];
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0].trim();
      if (!/^(_fbp|_fbc|_ga(?:_.+)?|_gid|_gat(?:_.+)?|_gcl_.+)$/.test(name)) continue;
      for (const cookiePath of paths) {
        const expired = name + "=; Max-Age=0; path=" + cookiePath + "; SameSite=Lax";
        document.cookie = expired;
        for (let index = 0; index < domains.length - 1; index += 1) {
          document.cookie = expired + "; domain=" + domains.slice(index).join(".");
        }
      }
    }
  }

  function updateConsentStatus() {
    const message = consentRecord?.status === "accepted" ? "Rastreamento opcional aceito."
      : consentRecord?.status === "denied" ? "Rastreamento opcional rejeitado."
        : "Rastreamento opcional desativado. Você ainda não fez uma escolha.";
    document.querySelectorAll("[data-consent-status]").forEach((element) => { element.textContent = message; });
  }

  function scheduleConsentExpiry() {
    window.clearTimeout(consentExpiryTimer);
    if (!analyticsAllowed || !consentRecord?.expiresAt) return;
    const remaining = consentRecord.expiresAt - Date.now();
    if (remaining <= 0) {
      applyConsent(null);
      return;
    }
    consentExpiryTimer = window.setTimeout(scheduleConsentExpiry, Math.min(remaining, 2147483647));
  }

  function applyConsent(record) {
    consentRecord = record;
    analyticsAllowed = record?.status === "accepted" && record.expiresAt > Date.now();
    updateConsentStatus();
    if (!analyticsAllowed) {
      window.clearTimeout(consentExpiryTimer);
      if (analyticsInitialized) {
        const gaId = config.analytics?.ga4MeasurementId?.trim();
        if (gaId) window["ga-disable-" + gaId] = true;
        updateLoadedAnalyticsConsent(false);
      }
      clearOptionalCookies();
      // A reload unloads vendor listeners; the persisted rejection keeps them unloaded.
      if (analyticsInitialized) window.location.reload();
      return;
    }
    initializeAnalytics();
    reportVisibleOffer();
    scheduleConsentExpiry();
  }

  function initializeAnalytics() {
    if (!analyticsAllowed || analyticsInitialized) return;
    analyticsInitialized = true;
    const metaId = config.analytics?.metaPixelId?.trim();
    const gaId = config.analytics?.ga4MeasurementId?.trim();

    if (metaId) {
      if (typeof window.fbq !== "function") {
        const fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
        window.fbq = fbq;
        window._fbq = fbq;
        fbq.push = fbq;
        fbq.loaded = true;
        fbq.version = "2.0";
        fbq.queue = [];
        const pixelScript = document.createElement("script");
        pixelScript.async = true;
        pixelScript.src = "https://connect.facebook.net/en_US/fbevents.js";
        document.head.append(pixelScript);
      }
      window.fbq("consent", "grant");
      window.fbq("init", metaId);
      window.fbq("track", "PageView");
    }

    if (gaId) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("consent", "default", gaConsentSettings("granted"));
      window.gtag("js", new Date());
      window.gtag("config", gaId, { send_page_view: true });
      const gaScript = document.createElement("script");
      gaScript.async = true;
      gaScript.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gaId);
      document.head.append(gaScript);
    }
  }

  function setConsent(value) {
    if (!["accepted", "denied"].includes(value)) return;
    const now = Date.now();
    const record = { version: 2, status: value, updatedAt: now, expiresAt: now + consentLifetime };
    try {
      window.localStorage.setItem(consentKey, JSON.stringify(record));
      window.localStorage.removeItem(legacyConsentKey);
    } catch {
      // Removing a previous acceptance also works when a storage quota blocks writes.
      if (value === "denied") {
        try { window.localStorage.removeItem(consentKey); } catch { /* Storage is unavailable. */ }
      }
      // An explicit choice remains valid for this page when storage is unavailable.
    }
    consentDialog?.close();
    applyConsent(record);
  }

  document.querySelectorAll("[data-consent-preferences]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (!consentDialog || typeof consentDialog.showModal !== "function") return;
      event.preventDefault();
      updateConsentStatus();
      if (!consentDialog.open) consentDialog.showModal();
    });
  });
  document.querySelectorAll("[data-consent]").forEach((button) => {
    button.addEventListener("click", () => setConsent(button.dataset.consent));
  });
  document.querySelectorAll("[data-consent-close]").forEach((button) => {
    button.addEventListener("click", () => consentDialog?.close());
  });
  window.addEventListener("storage", (event) => {
    if (event.key === consentKey || event.key === null) applyConsent(readConsent());
  });

  function track(eventName, details = {}) {
    if (!analyticsAllowed) return false;
    if (!consentRecord || consentRecord.expiresAt <= Date.now()) {
      applyConsent(null);
      return false;
    }
    const payload = {
      product_name: config.productName || "500 Mantras para Elevar Sua Energia",
      experiment_id: experimentId,
      experiment_variant: variant,
      currency: config.currency || "BRL",
      value: Number(config.price || 19.9),
      ...details,
    };
    if (typeof window.gtag === "function") window.gtag("event", eventName, payload);
    if (typeof window.fbq === "function") {
      if (eventName === "view_offer") window.fbq("trackCustom", "OfferViewed", payload);
      if (eventName === "begin_checkout") window.fbq("track", "InitiateCheckout", payload);
      if (eventName === "video_start") window.fbq("trackCustom", "VideoStart", payload);
      if (eventName === "video_progress") window.fbq("trackCustom", "VideoProgress", payload);
      if (eventName === "video_complete") window.fbq("trackCustom", "VideoComplete", payload);
    }
    return true;
  }

  const productVideo = document.getElementById("productVideo");
  const videoPlay = document.getElementById("videoPlay");
  const videoEndedCta = document.getElementById("videoEndedCta");
  let videoStarted = false;
  const videoProgressMarks = new Set();
  // Keep native controls usable if JavaScript is unavailable.
  if (productVideo && videoPlay) videoPlay.hidden = false;
  videoPlay?.addEventListener("click", () => {
    productVideo?.play().catch(() => {
      if (videoPlay) videoPlay.hidden = false;
    });
  });
  productVideo?.addEventListener("play", () => {
    if (videoPlay) videoPlay.hidden = true;
    if (videoEndedCta) videoEndedCta.hidden = true;
    if (videoStarted) return;
    videoStarted = true;
    videoProgressMarks.clear();
    track("video_start", { video_title: "Apresentação dos 500 Mantras" });
  });
  productVideo?.addEventListener("pause", () => {
    if (productVideo.currentTime === 0 && videoPlay) videoPlay.hidden = false;
  });
  productVideo?.addEventListener("timeupdate", () => {
    const duration = productVideo.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    for (const percent of [25, 50, 75]) {
      if (productVideo.currentTime / duration * 100 >= percent && !videoProgressMarks.has(percent)) {
        videoProgressMarks.add(percent);
        track("video_progress", { video_title: "Apresentação dos 500 Mantras", video_percent: percent });
      }
    }
  });
  productVideo?.addEventListener("ended", () => {
    track("video_complete", { video_title: "Apresentação dos 500 Mantras" });
    videoStarted = false;
    if (videoEndedCta) videoEndedCta.hidden = false;
  });

  const offer = document.getElementById("oferta");
  function reportVisibleOffer() {
    if (offerInView && !offerViewed && track("view_offer", { content_name: "Oferta 500 Mantras" })) {
      offerViewed = true;
      offerObserver?.disconnect();
    }
  }
  if (offer && "IntersectionObserver" in window) {
    offerObserver = new IntersectionObserver((entries) => {
      offerInView = entries.some((entry) => entry.isIntersecting);
      reportVisibleOffer();
    }, { threshold: 0.15 });
    offerObserver.observe(offer);
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[data-checkout]");
    if (!link || !safeCheckout) return;
    link.href = checkoutHref();
    track("begin_checkout", { cta_location: link.dataset.ctaLocation || "checkout" });
  });

  document.querySelectorAll(".faq-list details").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      if (!detail.open) return;
      document.querySelectorAll(".faq-list details[open]").forEach((other) => {
        if (other !== detail) other.open = false;
      });
    });
  });

  let scrollPending = false;
  window.addEventListener("scroll", () => {
    if (scrollPending) return;
    scrollPending = true;
    window.requestAnimationFrame(() => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
      const indicator = document.getElementById("readingProgress");
      if (indicator) indicator.style.transform = "scaleX(" + progress + ")";
      scrollPending = false;
    });
  }, { passive: true });

  const year = document.getElementById("copyrightYear");
  if (year) year.textContent = String(new Date().getFullYear());

  applyConsent(consentRecord);
})();

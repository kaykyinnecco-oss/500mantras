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
  const consentKey = "mantras.analytics.consent.v1";
  const consentBanner = document.getElementById("consentBanner");

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
      window.fbq("init", metaId);
      window.fbq("track", "PageView");
    }

    if (gaId) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", gaId, { send_page_view: true });
      const gaScript = document.createElement("script");
      gaScript.async = true;
      gaScript.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gaId);
      document.head.append(gaScript);
    }
  }

  function setConsent(value) {
    try { window.localStorage.setItem(consentKey, value); } catch { /* Tracking stays off when storage is unavailable. */ }
    analyticsAllowed = value === "granted";
    if (consentBanner) consentBanner.hidden = true;
    initializeAnalytics();
  }

  let savedConsent = null;
  try { savedConsent = window.localStorage.getItem(consentKey); } catch { /* The page remains usable without storage. */ }
  const metricsConfigured = Boolean(config.analytics?.metaPixelId?.trim() || config.analytics?.ga4MeasurementId?.trim());
  if (savedConsent === "granted") {
    analyticsAllowed = true;
    initializeAnalytics();
  } else if (savedConsent !== "denied" && metricsConfigured && consentBanner) {
    consentBanner.hidden = false;
  }
  document.getElementById("acceptAnalytics")?.addEventListener("click", () => setConsent("granted"));
  document.getElementById("rejectAnalytics")?.addEventListener("click", () => setConsent("denied"));
  document.getElementById("openConsentSettings")?.addEventListener("click", (event) => {
    event.preventDefault();
    if (consentBanner) consentBanner.hidden = false;
  });

  function track(eventName, details = {}) {
    if (!analyticsAllowed) return;
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
  }

  const productVideo = document.getElementById("productVideo");
  const videoPlay = document.getElementById("videoPlay");
  const videoEndedCta = document.getElementById("videoEndedCta");
  let videoStarted = false;
  const videoProgressMarks = new Set();
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

  let offerViewed = false;
  const offer = document.getElementById("oferta");
  if (offer && "IntersectionObserver" in window) {
    const offerObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !offerViewed) {
        offerViewed = true;
        track("view_offer", { content_name: "Oferta 500 Mantras" });
        offerObserver.disconnect();
      }
    }, { threshold: 0.24 });
    offerObserver.observe(offer);
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[data-checkout]");
    if (!link || !safeCheckout) return;
    link.href = checkoutHref();
    track("begin_checkout", { cta_location: link.dataset.ctaLocation || "checkout" });
  });

  const previewDialog = document.getElementById("previewDialog");
  const dialogImage = document.getElementById("dialogImage");
  const dialogTitle = document.getElementById("dialogTitle");
  document.querySelectorAll("[data-preview]").forEach((button) => {
    button.addEventListener("click", () => {
      const image = button.dataset.src;
      if (!image || !previewDialog || !dialogImage) return;
      dialogImage.src = image;
      dialogImage.alt = button.dataset.alt || "Prévia ampliada de uma página do e-book";
      dialogTitle.textContent = button.dataset.title || "Página interna";
      previewDialog.showModal();
    });
  });
  document.getElementById("closePreview")?.addEventListener("click", () => previewDialog?.close());
  previewDialog?.addEventListener("click", (event) => {
    if (event.target === previewDialog) previewDialog.close();
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
})();

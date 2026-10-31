const SITE_CONFIG = {
  checkout: {
    essential: { url: "https://pay.cakto.com.br/323zgdr_1243414", value: 9.99 },
    complete: { url: "https://pay.cakto.com.br/ihyd7v3_1261754", value: 37.99 }
  },
  timezone: "America/Sao_Paulo",
  currency: "BRL"
};

// Ajuste estes valores para controlar o comportamento do pop-up.
const OFFER_POPUP_INITIAL_DELAY_MS = 6000;
const OFFER_POPUP_REOPEN_DELAY_MS = 8000;
const OFFER_POPUP_MAX_REOPENS = 6;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function getUtmParams() {
  const source = new URLSearchParams(window.location.search);
  const utms = new URLSearchParams();
  source.forEach((value, key) => {
    if (key.toLowerCase().startsWith("utm_")) utms.set(key, value);
  });
  return utms;
}

function decorateCheckoutLinks() {
  const utms = getUtmParams();
  document.querySelectorAll(".checkout-link").forEach((link) => {
    const plan = link.dataset.plan;
    const config = SITE_CONFIG.checkout[plan];
    const url = new URL(config.url);
    utms.forEach((value, key) => url.searchParams.set(key, value));
    link.href = url.toString();
    link.addEventListener("click", () => {
      sessionStorage.setItem("checkout_started", "1");
      closeOfferPopup({ suppress: true });
      if (typeof window.fbq === "function") {
        window.fbq("track", "InitiateCheckout", {
          value: config.value,
          currency: SITE_CONFIG.currency,
          content_name: plan === "complete" ? "Plano Completo" : "Plano Essencial"
        });
      }
    });
  });
}

function createParticles() {
  const container = document.querySelector(".particles");
  if (!container || reducedMotion) return;
  for (let index = 0; index < 18; index += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    particle.style.left = `${4 + Math.random() * 92}%`;
    particle.style.top = `${8 + Math.random() * 78}%`;
    particle.style.setProperty("--duration", `${6 + Math.random() * 6}s`);
    particle.style.setProperty("--delay", `${-Math.random() * 6}s`);
    container.appendChild(particle);
  }
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  items.forEach((item) => observer.observe(item));
}

function animateValue(element, target, duration = 1200, decimals = 0) {
  if (reducedMotion) {
    element.textContent = decimals ? target.toFixed(decimals).replace(".", ",") : String(target);
    return;
  }
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    element.textContent = decimals ? value.toFixed(decimals).replace(".", ",") : Math.round(value).toLocaleString("pt-BR");
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initCounters() {
  const elements = document.querySelectorAll("[data-count], [data-price]");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.target.dataset.counted) return;
      entry.target.dataset.counted = "true";
      const isPrice = entry.target.hasAttribute("data-price");
      const value = Number(entry.target.dataset.price || entry.target.dataset.count);
      animateValue(entry.target, value, isPrice ? 1450 : 1150, isPrice ? 2 : 0);
      observer.unobserve(entry.target);
    });
  }, { threshold: .5 });
  elements.forEach((element) => observer.observe(element));
}

function initScrollButtons() {
  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.scrollTarget)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    });
  });
}

function initCarousel() {
  const carousel = document.querySelector(".testimonial-carousel");
  if (!carousel) return;
  const step = () => Math.min(310, carousel.clientWidth * .85);
  document.querySelector(".carousel-prev")?.addEventListener("click", () => carousel.scrollBy({ left: -step(), behavior: "smooth" }));
  document.querySelector(".carousel-next")?.addEventListener("click", () => carousel.scrollBy({ left: step(), behavior: "smooth" }));
}

function initLightbox() {
  const lightbox = document.getElementById("lightbox");
  const image = document.getElementById("lightbox-image");
  const close = () => {
    lightbox.hidden = true;
    image.src = "";
    document.body.classList.remove("modal-open");
  };
  document.querySelectorAll(".testimonial-shot").forEach((button) => {
    button.addEventListener("click", () => {
      image.src = button.dataset.full;
      image.alt = button.querySelector("img").alt;
      lightbox.hidden = false;
      document.body.classList.add("modal-open");
      lightbox.querySelector(".modal-close").focus();
    });
  });
  lightbox.querySelector(".modal-close").addEventListener("click", close);
  lightbox.addEventListener("click", (event) => { if (event.target === lightbox) close(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !lightbox.hidden) close(); });
}

let popupTimer;
let popupReopens = 0;

function popupIsSuppressed() {
  return sessionStorage.getItem("checkout_started") || sessionStorage.getItem("offer_popup_dismissed");
}

function scheduleOfferPopup(delay, isReopen = false) {
  clearTimeout(popupTimer);
  if (popupIsSuppressed() || (isReopen && popupReopens >= OFFER_POPUP_MAX_REOPENS)) return;
  popupTimer = window.setTimeout(() => showOfferPopup(isReopen), delay);
}

function showOfferPopup(isReopen = false) {
  const popup = document.getElementById("offer-popup");
  if (!popup || popupIsSuppressed() || !popup.hidden) return;
  if (isReopen) popupReopens += 1;
  popup.hidden = false;
  document.body.classList.add("modal-open");
  popup.querySelector(".popup-close").focus();
}

function closeOfferPopup({ reopen = false, suppress = false } = {}) {
  clearTimeout(popupTimer);
  const popup = document.getElementById("offer-popup");
  if (suppress) sessionStorage.setItem("offer_popup_dismissed", "1");
  if (popup && !popup.hidden) popup.hidden = true;
  document.body.classList.remove("modal-open");
  if (reopen && !popupIsSuppressed()) scheduleOfferPopup(OFFER_POPUP_REOPEN_DELAY_MS, true);
}

function initOfferPopup() {
  document.querySelectorAll("[data-popup-x]").forEach((element) => element.addEventListener("click", () => closeOfferPopup({ reopen: true })));
  document.querySelector("[data-popup-dismiss]")?.addEventListener("click", () => closeOfferPopup({ suppress: true }));
  document.addEventListener("keydown", (event) => {
    const popup = document.getElementById("offer-popup");
    if (event.key === "Escape" && popup && !popup.hidden) closeOfferPopup({ reopen: true });
  });
  scheduleOfferPopup(OFFER_POPUP_INITIAL_DELAY_MS);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("footer-year").textContent = new Intl.DateTimeFormat("pt-BR", { year: "numeric", timeZone: SITE_CONFIG.timezone }).format(new Date());
  decorateCheckoutLinks();
  createParticles();
  initReveal();
  initCounters();
  initScrollButtons();
  initCarousel();
  initLightbox();
  initOfferPopup();
});

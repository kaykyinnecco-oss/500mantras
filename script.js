const SITE_CONFIG = {
  checkout: {
    essential: { url: "https://pay.cakto.com.br/323zgdr_1243414", value: 9.99 },
    complete: { url: "https://pay.cakto.com.br/ihyd7v3_1261754", value: 37.99 }
  },
  timezone: "America/Sao_Paulo",
  currency: "BRL"
};

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

let popupTrigger;

function showOfferPopup(trigger) {
  const popup = document.getElementById("offer-popup");
  if (!popup || !popup.hidden) return;
  popupTrigger = trigger;
  popup.hidden = false;
  document.body.classList.add("modal-open");
  popup.querySelector(".popup-close").focus();
}

function closeOfferPopup({ suppress = false } = {}) {
  const popup = document.getElementById("offer-popup");
  if (suppress) sessionStorage.setItem("offer_popup_dismissed", "1");
  const wasOpen = popup && !popup.hidden;
  if (wasOpen) popup.hidden = true;
  document.body.classList.remove("modal-open");
  if (wasOpen && !suppress) popupTrigger?.focus({ preventScroll: true });
  popupTrigger = undefined;
}

function initOfferPopup() {
  // Somente ações explícitas de escolha de planos podem abrir o modal.
  document.querySelectorAll('a[href="#planos"], [data-popup-open]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      showOfferPopup(button);
    });
  });
  document.querySelectorAll("[data-popup-x]").forEach((element) => element.addEventListener("click", () => closeOfferPopup()));
  document.querySelector("[data-popup-dismiss]")?.addEventListener("click", () => closeOfferPopup());
  document.addEventListener("keydown", (event) => {
    const popup = document.getElementById("offer-popup");
    if (event.key === "Escape" && popup && !popup.hidden) closeOfferPopup();
  });
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

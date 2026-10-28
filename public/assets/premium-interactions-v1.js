(() => {
  "use strict";
  const config = window.MANTRAS_CONTENT;
  if (!config) return;
  const policy = window.MANTRAS_CONTENT_POLICY;
  const localPreview = ["localhost", "127.0.0.1"].includes(location.hostname)
    && new URLSearchParams(location.search).get("previewContent") === "1";
  function SocialProofRating(root, data) {
    if (!root) return;
    const approved = policy.ratingIsPublishable(data);
    if (approved || localPreview) {
      root.querySelector("[data-rating-label]").textContent = `${localPreview && !approved ? "PRÉVIA NÃO PUBLICADA · " : ""}AVALIAÇÃO ${data.target.toFixed(1).replace(".", ",")}/5,0${approved && Number.isInteger(data.count) && data.count > 0 ? ` · ${data.count} avaliações` : ""}`;
      const stars = root.querySelector("[data-rating-stars]");
      stars.hidden = false;
      for (let index = 0; index < 5; index++) {
        const star = document.createElement("span");
        for (const filled of [false, true]) {
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("viewBox", "0 0 24 24");
          svg.setAttribute("aria-hidden", "true");
          const shape = document.createElementNS("http://www.w3.org/2000/svg", "use");
          shape.setAttribute("href", "#rating-star");
          svg.append(shape);
          if (filled) {
            svg.classList.add("rating-fill");
            svg.style.clipPath = `inset(0 ${100 - Math.max(0, Math.min(1, data.target - index)) * 100}% 0 0)`;
          }
          star.append(svg);
        }
        stars.append(star);
      }
      stars.setAttribute("role", "img");
      stars.setAttribute("aria-label", `Avaliação de ${data.target} de 5`);
    }
    const avatars = root.querySelector("[data-rating-avatars]");
    for (const item of policy.approvedAvatars(data.avatars)) {
      const image = document.createElement("img");
      image.src = item.src; image.alt = item.alt || "Leitor que autorizou a divulgação";
      image.width = 44; image.height = 44; image.loading = "lazy";
      avatars.append(image);
    }
    if (localPreview && !avatars.children.length) {
      const label = document.createElement("span");
      label.textContent = "PRÉVIA · espaço para fotos autorizadas";
      avatars.append(label);
    }
    avatars.hidden = !avatars.children.length;
  }
  SocialProofRating(document.querySelector('[data-component="SocialProofRating"]'), config.rating);

  const journeyPause = document.querySelector("[data-toggle-journeys]");
  const journeyTrack = document.querySelector(".journey-track");
  journeyPause?.addEventListener("click", () => {
    const paused = journeyPause.getAttribute("aria-pressed") !== "true";
    journeyPause.setAttribute("aria-pressed", String(paused));
    journeyPause.textContent = paused ? "Retomar movimento das jornadas" : "Pausar movimento das jornadas";
    journeyTrack?.classList.toggle("is-paused", paused);
  });

  const select = document.getElementById("journeySelect");
  config.journeys.forEach((item, index) => select.add(new Option(item.name, String(index))));
  const showJourney = () => {
    const item = config.journeys[Number(select.value)] || config.journeys[0];
    document.getElementById("journeyMessage").textContent = `“${item.text}”`;
    document.getElementById("journeySource").textContent = item.source;
  };
  select.addEventListener("change", showJourney); showJourney();
  document.getElementById("journeyMessage").parentElement.setAttribute("aria-live", "polite");

  const lightbox = document.getElementById("imageLightbox");
  let lightboxTrigger;
  function openImage(src, alt, trigger) {
    lightboxTrigger = trigger;
    const image = lightbox.querySelector("img"); image.src = src; image.alt = alt;
    lightbox.showModal();
  }
  lightbox.querySelector("[data-close-lightbox]").addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("close", () => { lightbox.querySelector("img").removeAttribute("src"); lightboxTrigger?.focus(); });
  document.querySelectorAll(".page-preview-static img").forEach((image) => {
    const button = document.createElement("button"); button.type = "button";
    button.className = "preview-zoom"; button.setAttribute("aria-label", `Ampliar: ${image.alt}`);
    image.replaceWith(button); button.append(image);
    button.addEventListener("click", () => openImage(image.src, image.alt, button));
  });
  function WhatsAppTestimonials(root, items) {
    if (!root) return;
    const accepted = policy.approvedTestimonials(items);
    if (!accepted.length) return; // No blank cards or pending claims in production.
    root.hidden = false;
    const track = root.querySelector(".whatsapp-track");
    accepted.forEach((item) => {
      const card = document.createElement("figure");
      const button = document.createElement("button"); button.type = "button";
      const image = document.createElement("img"); image.src = item.src; image.alt = item.alt; image.loading = "lazy";
      if (item.width > 0 && item.height > 0) { image.width = item.width; image.height = item.height; }
      button.append(image); button.setAttribute("aria-label", `Ampliar depoimento: ${item.alt}`);
      button.addEventListener("click", () => openImage(item.src, item.alt, button));
      card.append(button);
      if (item.name || item.date) { const caption = document.createElement("figcaption"); caption.textContent = [item.name, item.date].filter(Boolean).join(" · "); card.append(caption); }
      track.append(card);
    });
    const status = root.querySelector("[data-whatsapp-status]");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let index = 0;
    const update = () => {
      const left = track.getBoundingClientRect().left + track.clientLeft;
      const overflow = track.scrollWidth > track.clientWidth + 2;
      index = [...track.children].reduce((best, item, i) => Math.abs(item.getBoundingClientRect().left - left) < Math.abs(track.children[best].getBoundingClientRect().left - left) ? i : best, 0);
      status.textContent = `${index + 1} de ${accepted.length}`;
      root.querySelector(".whatsapp-controls").hidden = !overflow;
      root.querySelector("[data-whatsapp-prev]").disabled = !overflow || index === 0;
      root.querySelector("[data-whatsapp-next]").disabled = !overflow || index === accepted.length - 1;
    };
    const go = (delta) => {
      const target = track.children[Math.max(0, Math.min(accepted.length - 1, index + delta))];
      const left = track.scrollLeft + target.getBoundingClientRect().left - track.getBoundingClientRect().left - track.clientLeft;
      track.scrollTo({ left, behavior: reduced.matches ? "instant" : "smooth" });
    };
    root.querySelector("[data-whatsapp-prev]").addEventListener("click", () => go(-1));
    root.querySelector("[data-whatsapp-next]").addEventListener("click", () => go(1));
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    track.addEventListener("keydown", (event) => { if (event.target === track && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); go(event.key === "ArrowRight" ? 1 : -1); } });
    update();
  }
  WhatsAppTestimonials(document.getElementById("whatsapp-testimonials"), config.whatsapp);

  // Real absolute deadline only; expiry hides the counter instead of resetting it.
  const deadline = Date.parse(config.promotion.endsAt);
  const counter = document.getElementById("promotionCountdown");
  if (Number.isFinite(deadline) && deadline > Date.now()) {
    const tick = () => { const seconds = Math.max(0, Math.floor((deadline - Date.now()) / 1000)); counter.hidden = !seconds; counter.textContent = ` · ${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}min ${seconds % 60}s`; };
    tick(); const timer = setInterval(() => { tick(); if (Date.now() >= deadline) clearInterval(timer); }, 1000);
  }

  const modal = document.getElementById("exitOffer");
  const manual = document.querySelector("[data-open-exit]");
  const key = "mantras.exit-offer.v1";
  let checkout = false, shown = false, maxScroll = 0, trigger;
  let available = true;
  try { available = !sessionStorage.getItem(key) && Number(localStorage.getItem(key) || 0) < Date.now(); } catch { /* Keep in-memory frequency protection. */ }
  manual.hidden = !available;
  const started = Date.now();
  const open = (source) => {
    if (!available || shown || checkout || document.hidden || document.querySelector("dialog[open]")) return;
    trigger = source; shown = true; available = false; manual.hidden = true;
    try { sessionStorage.setItem(key, "shown"); } catch { /* Session-only in memory. */ }
    modal.showModal();
  };
  manual.addEventListener("click", () => open(manual));
  document.addEventListener("pointerdown", (event) => { if (event.target.closest("[data-checkout]")) { checkout = true; manual.hidden = true; } }, true);
  document.addEventListener("click", (event) => { if (event.target.closest("[data-checkout]")) { checkout = true; manual.hidden = true; } }, true);
  window.addEventListener("scroll", () => { const range = document.documentElement.scrollHeight - innerHeight; maxScroll = Math.max(maxScroll, range > 0 ? scrollY / range : 0); }, { passive: true });
  document.addEventListener("mouseout", (event) => {
    if (matchMedia("(hover: hover) and (pointer: fine)").matches && !event.relatedTarget && event.clientY <= 0 && Date.now() - started >= 30000 && maxScroll >= .25) open(document.activeElement);
  });
  modal.querySelectorAll("[data-close-exit]").forEach((button) => button.addEventListener("click", () => modal.close()));
  modal.addEventListener("close", () => {
    try { localStorage.setItem(key, String(Date.now() + 86400000)); } catch { /* Remains suppressed in this session. */ }
    if (trigger?.isConnected && !trigger.hidden && trigger.matches('a[href],button:not(:disabled),input,select,[tabindex]')) {
      trigger.focus({ preventScroll: true });
    } else {
      const nearest = [...document.querySelectorAll("a[data-checkout]")]
        .filter((link) => link.getClientRects().length)
        .sort((a, b) => Math.abs(a.getBoundingClientRect().top) - Math.abs(b.getBoundingClientRect().top))[0];
      nearest?.focus({ preventScroll: true });
    }
  });
})();

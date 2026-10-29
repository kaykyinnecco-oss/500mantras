(() => {
  "use strict";

  if (document.documentElement.dataset.premiumInteractionsReady === "true") return;
  document.documentElement.dataset.premiumInteractionsReady = "true";
  const config = window.LANDING_CONFIG || {};
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const content = config.content || {};
  let pageActive = true;

  function safeStorage(storage, action, key, value) {
    try { return window[storage][action](key, value); } catch { return null; }
  }

  function imageSource(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const url = new URL(value, window.location.href);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  }

  function focusBack(element) {
    if (element instanceof HTMLElement && element.isConnected) element.focus({ preventScroll: true });
  }

  function anotherDialogIsOpen(except) {
    return [...document.querySelectorAll("dialog[open]")].some((dialog) => dialog !== except);
  }

  // A campaign uses one absolute deadline for everyone, never a visitor-relative clock.
  const campaign = config.campaign || {};
  const rawDeadline = typeof campaign.endsAt === "string" ? campaign.endsAt : "";
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(rawDeadline);
  const campaignDeadline = hasTimezone ? Date.parse(rawDeadline) : NaN;
  const countdownElements = document.querySelectorAll("[data-campaign-timer]");
  const campaignMessages = document.querySelectorAll("[data-campaign-message]");
  const neutralMessage = campaign.message || "Seu e-book completo. Pagamento único, sem assinatura.";
  const expiredMessage = campaign.expiredMessage || "Consulte as condições atuais no checkout.";
  let countdownTimer;

  function renderCountdown() {
    window.clearTimeout(countdownTimer);
    const remaining = campaignDeadline - Date.now();
    const active = Number.isFinite(campaignDeadline) && remaining > 0;
    countdownElements.forEach((element) => { element.hidden = !active; });
    campaignMessages.forEach((element) => {
      element.textContent = Number.isFinite(campaignDeadline) && remaining <= 0 ? expiredMessage : neutralMessage;
    });
    document.querySelectorAll("[data-campaign-state]").forEach((element) => {
      element.dataset.campaignState = active ? "active" : Number.isFinite(campaignDeadline) ? "expired" : "neutral";
    });
    if (active) {
      const seconds = Math.max(0, Math.ceil(remaining / 1000));
      const values = {
        hours: Math.floor(seconds / 3600),
        minutes: Math.floor(seconds / 60) % 60,
        seconds: seconds % 60,
      };
      document.querySelectorAll("[data-countdown]").forEach((element) => {
        if (Object.hasOwn(values, element.dataset.countdown)) element.textContent = String(values[element.dataset.countdown]).padStart(2, "0");
      });
      countdownElements.forEach((element) => {
        element.setAttribute("aria-label", `${values.hours} horas, ${values.minutes} minutos e ${values.seconds} segundos restantes na campanha`);
      });
      if (pageActive && document.visibilityState !== "hidden") countdownTimer = window.setTimeout(renderCountdown, 1000);
    }
  }

  // The repeat scheduler counts foreground, modal-free time and has one active timer.
  const popup = document.getElementById("offerPopup");
  const popupConfig = config.popup || {};
  const nonnegative = (value, fallback) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : fallback;
  const initialDelay = nonnegative(popupConfig.initialDelayMs, 6000);
  const repeatDelay = nonnegative(popupConfig.repeatDelayMs, 4000);
  const maxDisplays = Math.floor(nonnegative(popupConfig.maxDisplaysPerSession, 3));
  const repeatEnabled = popupConfig.repeatEnabled !== false;
  const popupEnabled = popupConfig.enabled !== false && maxDisplays > 0 && popup && typeof popup.showModal === "function";
  const popupKey = "mantras.offer-popup.v1";
  const checkoutKey = "mantras.checkout-navigation.v1";
  const storedDisplayCount = Number(safeStorage("sessionStorage", "getItem", popupKey));
  let displayCount = Number.isFinite(storedDisplayCount) ? Math.max(0, Math.floor(storedDisplayCount)) : 0;
  if (safeStorage("sessionStorage", "getItem", "mantras.popup-continue.v1")) displayCount = maxDisplays;
  let checkoutPaused = Boolean(safeStorage("sessionStorage", "getItem", checkoutKey));
  let popupTimer;
  let popupDueAt = 0;
  let popupRemaining = initialDelay;
  let popupWaitingForClose = false;
  let popupFocusOrigin;
  let popupHasSchedule = Boolean(popupEnabled);

  function setPopupState(state) {
    if (!popup) return;
    popup.dataset.popupState = state;
    popup.dataset.displays = String(displayCount);
    popup.dataset.popupDisplayCount = String(displayCount);
    popup.dataset.maxDisplays = String(maxDisplays);
  }

  function pausePopup() {
    if (popupTimer) {
      popupRemaining = Math.max(0, popupDueAt - performance.now());
      window.clearTimeout(popupTimer);
      popupTimer = undefined;
    }
  }

  function popupCanOpen() {
    return popupEnabled && pageActive && document.visibilityState !== "hidden" && !checkoutPaused
      && displayCount < maxDisplays && !popupWaitingForClose && !popup.open && !anotherDialogIsOpen(popup);
  }

  function openPopup() {
    if (!popupCanOpen()) { resumePopup(); return; }
    popupHasSchedule = false;
    popupFocusOrigin = document.activeElement;
    popupWaitingForClose = true;
    try { popup.showModal(); } catch {
      popupWaitingForClose = false;
      popupHasSchedule = true;
      popupRemaining = repeatDelay;
      resumePopup();
      return;
    }
    displayCount += 1;
    safeStorage("sessionStorage", "setItem", popupKey, String(displayCount));
    setPopupState("open");
    try { popup.querySelector("a[data-checkout]")?.focus({ preventScroll: true }); } catch { /* Foco não interfere no checkout. */ }
  }

  function resumePopup() {
    pausePopup();
    if (!popupEnabled || !popupHasSchedule || popupWaitingForClose) return;
    if (displayCount >= maxDisplays) { setPopupState("limit"); return; }
    if (!popupCanOpen()) { setPopupState(checkoutPaused ? "checkout" : "paused"); return; }
    popupDueAt = performance.now() + popupRemaining;
    popupTimer = window.setTimeout(() => {
      popupTimer = undefined;
      popupRemaining = 0;
      openPopup();
    }, popupRemaining);
    setPopupState(displayCount ? "repeat-scheduled" : "initial-scheduled");
  }

  function scheduleRepeat() {
    pausePopup();
    popupWaitingForClose = false;
    if (!checkoutPaused) focusBack(popupFocusOrigin);
    popupFocusOrigin = undefined;
    if (repeatEnabled && displayCount < maxDisplays && !checkoutPaused) {
      popupHasSchedule = true;
      popupRemaining = repeatDelay;
      resumePopup();
    } else {
      popupHasSchedule = false;
      setPopupState(checkoutPaused ? "checkout" : displayCount >= maxDisplays ? "limit" : "closed");
    }
  }

  function closePopup() {
    if (popup?.open) popup.close();
    // Schedule from the user's close action, without waiting for a rendering frame.
    if (popupWaitingForClose) scheduleRepeat();
  }
  popup?.addEventListener("close", () => { if (!popup.open && popupWaitingForClose) scheduleRepeat(); });
  popup?.addEventListener("cancel", (event) => { event.preventDefault(); closePopup(); });
  document.querySelectorAll("[data-popup-close]").forEach((button) => {
    button.addEventListener("click", closePopup);
  });
  // A escolha de continuar não dispara métricas e vale para a sessão.
  popup?.addEventListener("click", (event) => {
    try {
      if (!event.target.closest("[data-popup-continue]")) return;
      displayCount = maxDisplays;
      safeStorage("sessionStorage", "setItem", "mantras.popup-continue.v1", "true");
      pausePopup();
      popupHasSchedule = false;
    } catch { /* Fechamento original permanece disponível. */ }
  }, true);
  popup?.addEventListener("keydown", (event) => {
    try {
      if (event.key !== "Tab") return;
      const controls = [...popup.querySelectorAll("a[href],button:not([disabled])")];
      if ((!event.shiftKey && document.activeElement === controls.at(-1)) || (event.shiftKey && document.activeElement === controls[0])) closePopup();
    } catch { /* Escape e botão de fechar continuam disponíveis. */ }
  });
  document.addEventListener("mouseout", (event) => {
    if (popupConfig.exitIntentEnabled !== true || event.relatedTarget || event.clientY > 0 || displayCount > 0) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || !popupCanOpen()) return;
    // Exit intent can complement a due timer, but never shorten the first six seconds.
    if (popupHasSchedule && popupRemaining > 0 && (!popupTimer || performance.now() < popupDueAt)) return;
    pausePopup();
    openPopup();
  });
  document.addEventListener("click", (event) => {
    const checkout = event.target.closest?.("a[data-checkout]");
    if (!checkout || checkout.getAttribute("aria-disabled") === "true") return;
    checkoutPaused = true;
    safeStorage("sessionStorage", "setItem", checkoutKey, String(Date.now()));
    pausePopup();
    setPopupState("checkout");
    if (popup?.open) closePopup();
  }, true);

  const dialogObserver = new MutationObserver((mutations) => {
    if (!mutations.some((mutation) => mutation.type === "childList" || mutation.target instanceof HTMLDialogElement)) return;
    if (anotherDialogIsOpen(popup)) { pausePopup(); setPopupState("paused"); }
    else resumePopup();
  });
  function observeDialogs() {
    dialogObserver.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
  }

  // One native lightbox serves the authentic PDF pages and supplied testimonials.
  const imageDialog = document.getElementById("imageDialog");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxPosition = document.getElementById("lightboxPosition");
  let lightboxItems = [];
  let lightboxIndex = 0;
  let imageFocusOrigin;

  function imagesForGroup(group) {
    const configured = group === "ebook" ? content.gallery : group === "testimonials" ? content.testimonials : [];
    if (Array.isArray(configured) && configured.length) return configured;
    return [...document.querySelectorAll("[data-image-group]")].filter((button) => button.dataset.imageGroup === group).map((button) => {
      const image = button.querySelector("img");
      return {
        src: button.dataset.imageSrc || image?.currentSrc || image?.src,
        alt: button.dataset.imageAlt || image?.alt,
        caption: button.dataset.imageCaption || button.querySelector("figcaption")?.textContent,
      };
    });
  }

  function renderLightbox() {
    const item = lightboxItems[lightboxIndex];
    if (!item || !lightboxImage) return;
    const source = imageSource(item.src);
    if (!source) return;
    lightboxImage.src = source;
    lightboxImage.alt = item.alt || item.title || "Imagem do material fornecido";
    if (lightboxCaption) lightboxCaption.textContent = item.caption || item.title || item.alt || "";
    if (lightboxPosition) lightboxPosition.textContent = `${lightboxIndex + 1} / ${lightboxItems.length}`;
    imageDialog.dataset.imageIndex = String(lightboxIndex);
    imageDialog.querySelectorAll("[data-image-step]").forEach((button) => { button.disabled = lightboxItems.length <= 1; });
    for (const offset of [-1, 1]) {
      const next = lightboxItems[(lightboxIndex + offset + lightboxItems.length) % lightboxItems.length];
      if (next && lightboxItems.length > 1) { const image = new Image(); image.src = imageSource(next.src); }
    }
  }

  function stepLightbox(step) {
    if (!imageDialog?.open || lightboxItems.length <= 1) return;
    lightboxIndex = (lightboxIndex + step + lightboxItems.length) % lightboxItems.length;
    renderLightbox();
  }

  document.querySelectorAll("[data-image-group]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!imageDialog || typeof imageDialog.showModal !== "function" || !lightboxImage || anotherDialogIsOpen(imageDialog)) return;
      lightboxItems = imagesForGroup(button.dataset.imageGroup);
      lightboxIndex = Math.max(0, Math.min(lightboxItems.length - 1, Number(button.dataset.imageIndex) || 0));
      if (!lightboxItems.length || !imageSource(lightboxItems[lightboxIndex]?.src)) return;
      imageFocusOrigin = button;
      imageDialog.dataset.imageGroup = button.dataset.imageGroup;
      renderLightbox();
      if (!imageDialog.open) imageDialog.showModal();
    });
  });
  document.querySelectorAll("[data-image-close]").forEach((button) => button.addEventListener("click", () => imageDialog?.close()));
  document.querySelectorAll("[data-image-step]").forEach((button) => button.addEventListener("click", () => stepLightbox(Number(button.dataset.imageStep) < 0 ? -1 : 1)));
  imageDialog?.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    stepLightbox(event.key === "ArrowLeft" ? -1 : 1);
  });
  imageDialog?.addEventListener("click", (event) => { if (event.target === imageDialog) imageDialog.close(); });
  imageDialog?.addEventListener("close", () => {
    if (imageDialog.open) return;
    focusBack(imageFocusOrigin);
    imageFocusOrigin = undefined;
    // Removing the URL also stops an abandoned image transfer after closing.
    lightboxImage?.removeAttribute("src");
  });

  // Native overflow keeps touch dragging, keyboard scrolling and image loading simple.
  const carouselControllers = [];
  document.querySelectorAll("[data-carousel][id]").forEach((track) => {
    if (!track.hasAttribute("tabindex")) track.tabIndex = 0;
    const controls = [...document.querySelectorAll("[data-carousel-target]")].filter((button) => button.dataset.carouselTarget === track.id);
    const status = [...document.querySelectorAll("[data-carousel-status]")].find((element) => element.dataset.carouselStatus === track.id);
    function update() {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      controls.forEach((button) => {
        const previous = Number(button.dataset.carouselStep) < 0;
        button.disabled = maxScroll < 2 || (previous ? track.scrollLeft <= 2 : track.scrollLeft >= maxScroll - 2);
      });
      if (status && track.children.length) {
        const items = [...track.children];
        const trackStart = track.getBoundingClientRect().left;
        let nearest = 0;
        let distance = Infinity;
        items.forEach((item, index) => {
          const candidate = Math.abs(item.getBoundingClientRect().left - trackStart);
          if (candidate < distance) { distance = candidate; nearest = index; }
        });
        status.textContent = `${nearest + 1} / ${items.length}`;
      }
    }
    controls.forEach((button) => {
      button.addEventListener("click", () => {
        const direction = Number(button.dataset.carouselStep) < 0 ? -1 : 1;
        const first = track.firstElementChild;
        const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
        const distance = first ? first.getBoundingClientRect().width + gap : track.clientWidth * .9;
        track.scrollBy({ left: direction * distance, behavior: reducedMotion.matches ? "auto" : "smooth" });
      });
    });
    track.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(track);
    track.querySelectorAll("img").forEach((image) => image.addEventListener("load", update, { once: true }));
    carouselControllers.push({ observer, track, update });
    update();
  });

  // Every explorer sentence comes from the supplied edition's extracted data.
  const select = document.getElementById("journeySelect");
  const mantraText = document.getElementById("mantraText");
  const mantraNumber = document.getElementById("mantraNumber");
  const mantraJourney = document.getElementById("mantraJourney");
  const journeys = Array.isArray(content.journeys) ? content.journeys.filter((journey) => Array.isArray(journey.samples) && journey.samples.length) : [];
  let selectedJourney = journeys.find((journey) => journey.id === select?.value) || journeys[0];
  let selectedSample = 0;

  function renderMantra(animate = false) {
    const sample = selectedJourney?.samples[selectedSample];
    if (!sample || !mantraText) return;
    mantraText.textContent = sample.text;
    if (animate && !reducedMotion.matches && typeof mantraText.animate === "function") {
      mantraText.getAnimations().forEach((animation) => animation.cancel());
      mantraText.animate([{ opacity: .3, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 250, easing: "cubic-bezier(.22,.75,.2,1)" });
    }
    if (mantraNumber) mantraNumber.textContent = sample.number != null ? `Mantra ${String(sample.number).padStart(3, "0")}` : "Uma mensagem do e-book";
    if (mantraJourney) mantraJourney.textContent = selectedJourney.title;
    mantraText.dataset.journey = selectedJourney.id;
    document.querySelectorAll("[data-journey-id]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.journeyId === selectedJourney.id));
    });
    document.querySelectorAll("[data-mantra-next]").forEach((button) => { button.disabled = selectedJourney.samples.length <= 1; });
    if (select) select.value = selectedJourney.id;
  }
  function chooseJourney(id) {
    const journey = journeys.find((item) => item.id === id);
    if (!journey) return;
    selectedJourney = journey;
    selectedSample = 0;
    renderMantra(true);
  }
  if (select && !select.options.length) {
    journeys.forEach((journey) => { const option = new Option(journey.title, journey.id); select.add(option); });
  }
  select?.addEventListener("change", () => chooseJourney(select.value));
  document.querySelectorAll("[data-journey-id]").forEach((button) => button.addEventListener("click", () => chooseJourney(button.dataset.journeyId)));
  document.querySelectorAll("[data-mantra-next]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!selectedJourney?.samples.length) return;
      selectedSample = (selectedSample + 1) % selectedJourney.samples.length;
      renderMantra(true);
    });
  });
  renderMantra();

  // Empty authenticity data produces no invented faces, scores or buyer counts.
  const social = config.socialProof || {};
  const avatars = Array.isArray(social.avatars) ? social.avatars.filter((avatar) => imageSource(avatar.src)) : [];
  const authenticRating = social.verified === true && Number.isFinite(social.rating) && social.rating > 0 && social.rating <= 5;
  document.querySelectorAll("[data-social-proof]").forEach((component) => {
    const avatarRow = component.querySelector("[data-social-avatars]");
    if (avatarRow) {
      avatarRow.replaceChildren();
      avatars.forEach((avatar) => {
        const image = document.createElement("img");
        image.src = imageSource(avatar.src);
        image.alt = avatar.alt || avatar.name || "Foto fornecida por uma leitora";
        image.width = 44;
        image.height = 44;
        image.loading = "lazy";
        image.decoding = "async";
        avatarRow.append(image);
      });
      avatarRow.hidden = !avatars.length;
    }
    component.querySelectorAll("[data-social-rating]").forEach((element) => {
      element.hidden = !authenticRating;
      if (authenticRating) element.textContent = `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(social.rating)}/5`;
    });
    component.querySelectorAll("[data-social-stars]").forEach((element) => { element.hidden = !authenticRating; });
    component.querySelectorAll("[data-social-count]").forEach((element) => {
      const valid = authenticRating && Number.isInteger(social.ratingCount) && social.ratingCount > 0;
      element.hidden = !valid;
      if (valid) element.textContent = `${new Intl.NumberFormat("pt-BR").format(social.ratingCount)} avaliações`;
    });
    component.querySelectorAll("[data-social-text]").forEach((element) => { element.textContent = social.text || ""; });
    component.hidden = !avatars.length && !authenticRating;
  });

  // Infinite strips have an explicit pause control as well as reduced-motion support.
  document.querySelectorAll("[data-motion-toggle], [data-journey-motion]").forEach((button) => {
    const target = document.getElementById(button.dataset.motionToggle || button.dataset.journeyMotion || "journeyMarquee");
    if (!target) return;
    button.addEventListener("click", () => {
      const paused = target.dataset.paused !== "true";
      target.dataset.paused = String(paused);
      button.setAttribute("aria-pressed", String(paused));
      button.textContent = paused ? "Retomar movimento" : "Pausar movimento";
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { pausePopup(); window.clearTimeout(countdownTimer); }
    else { renderCountdown(); resumePopup(); }
  });
  window.addEventListener("pagehide", () => {
    pageActive = false;
    pausePopup();
    window.clearTimeout(countdownTimer);
    dialogObserver.disconnect();
    carouselControllers.forEach(({ observer }) => observer?.disconnect());
  });
  window.addEventListener("pageshow", () => {
    pageActive = true;
    checkoutPaused = false;
    safeStorage("sessionStorage", "removeItem", checkoutKey);
    observeDialogs();
    carouselControllers.forEach(({ observer, track, update }) => { observer?.observe(track); update(); });
    renderCountdown();
    resumePopup();
  });

  renderCountdown();
  observeDialogs();
  resumePopup();
})();

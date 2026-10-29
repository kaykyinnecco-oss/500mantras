(() => {
  "use strict";
  const config = window.MANTRAS_CONTENT;
  if (!config) return;
  const site = window.LANDING_CONFIG || {};
  const promotion = { ...config.promotion, ...site.campaign };
  const popupConfig = { ...config.popup, ...site.popup };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const safeImage = (src) =>
    typeof src === "string" &&
    /^\/assets\/[\w/.-]+\.(?:webp|png|jpe?g|avif)$/i.test(src) &&
    !src.includes("..");
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  function image(item) {
    const node = element("img");
    Object.assign(node, {
      src: item.src,
      alt: item.alt,
      width: item.width,
      height: item.height,
      loading: "lazy",
      decoding: "async",
    });
    return node;
  }
  function SocialProofRating(root, data) {
    if (!root) return;
    const avatars = root.querySelector("[data-rating-avatars]");
    data.avatars
      .filter((item) => item.authorized === true && safeImage(item.src))
      .forEach((item) => {
        const frame = element("span", "lp-avatar");
        const photo = image({
          ...item,
          width: item.crop?.width || 128,
          height: item.crop?.height || 128,
        });
        if (item.crop) {
          photo.style.width = `${(item.crop.width / item.crop.size) * 100}%`;
          photo.style.left = `${(-item.crop.x / item.crop.size) * 100}%`;
          photo.style.top = `${(-item.crop.y / item.crop.size) * 100}%`;
        } else {
          photo.style.width = "100%";
          photo.style.height = "100%";
          photo.style.objectFit = "cover";
        }
        frame.append(photo);
        avatars.append(frame);
      });
    avatars.hidden = !avatars.children.length;
    // Screenshots are not star ratings. Publication needs independent evidence.
    const approved =
      data.publish === true &&
      typeof data.source === "string" &&
      data.source.trim() &&
      Number.isFinite(data.target) &&
      data.target >= 0 &&
      data.target <= 5;
    if (!approved) return;
    root.querySelector("[data-rating-label]").textContent =
      `AVALIAÇÃO ${data.target.toFixed(1).replace(".", ",")}/5,0${Number.isInteger(data.count) && data.count > 0 ? ` · ${data.count} avaliações` : ""}`;
    const stars = root.querySelector("[data-rating-stars]");
    stars.hidden = false;
    stars.setAttribute("role", "img");
    stars.setAttribute("aria-label", `${data.target} de 5 estrelas`);
    for (let index = 0; index < 5; index++) {
      const frame = element("span");
      for (const fill of [false, true]) {
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        const shape = document.createElementNS(svg.namespaceURI, "use");
        shape.setAttribute("href", "#rating-star");
        svg.append(shape);
        if (fill) {
          svg.classList.add("lp-rating-fill");
          svg.style.clipPath = `inset(0 ${100 - Math.max(0, Math.min(1, data.target - index)) * 100}% 0 0)`;
        }
        frame.append(svg);
      }
      stars.append(frame);
    }
  }
  SocialProofRating(
    document.querySelector('[data-component="SocialProofRating"]'),
    {
      ...config.rating,
      publish: site.socialProof?.verified === true,
      target: site.socialProof?.rating ?? config.rating.target,
      count: site.socialProof?.ratingCount ?? null,
      source: site.socialProof?.source || "",
      avatars: site.socialProof?.avatars?.length
        ? site.socialProof.avatars
        : config.rating.avatars,
    },
  );

  const gallery = document.getElementById("previewGallery");
  const previewCards = config.gallery
    .filter((item) => safeImage(item.src) && safeImage(item.full))
    .map((item) => {
      const card = element("figure", "lp-page-card");
      const button = element("button", "lp-image-trigger");
      button.type = "button";
      Object.assign(button.dataset, {
        zoomGroup: "ebook",
        full: item.full,
        caption: `Página ${item.pdfPage} · ${item.name}`,
      });
      button.setAttribute(
        "aria-label",
        `Ampliar página ${item.pdfPage}: ${item.name}`,
      );
      button.append(
        image(item),
        element(
          "span",
          "",
          `Ampliar página ${String(item.pdfPage).padStart(2, "0")} ↗`,
        ),
      );
      const caption = element("figcaption");
      caption.append(
        element(
          "span",
          "lp-kicker",
          `PÁGINA ${String(item.pdfPage).padStart(2, "0")}`,
        ),
        element("h3", "", item.name),
        element("blockquote", "", `“${item.text}”`),
      );
      card.append(button, caption);
      return card;
    });
  if (previewCards.length) gallery.replaceChildren(...previewCards);

  function WhatsAppTestimonials(root, items) {
    if (!root) return;
    const approved = items
      .filter(
        (item) =>
          item.authorized === true &&
          item.privacyReviewed === true &&
          item.alt &&
          safeImage(item.src) &&
          safeImage(item.full),
      )
      .sort((a, b) => a.order - b.order);
    const track = root.querySelector("[data-carousel]");
    track.replaceChildren();
    root.hidden = !approved.length;
    approved.forEach((item) => {
      const card = element("figure", "lp-feedback-card");
      const button = element("button", "lp-feedback-image");
      button.type = "button";
      Object.assign(button.dataset, {
        zoomGroup: "feedback",
        full: item.full,
        caption: `Depoimento de ${item.name}`,
      });
      button.setAttribute("aria-label", `Ampliar conversa de ${item.name}`);
      button.append(image(item));
      const caption = element("figcaption");
      caption.append(
        element("h3", "", item.name),
        element("p", "", "Toque no print para ampliar a conversa."),
      );
      if (item.quote) {
        const transcript = element("details");
        transcript.append(
          element("summary", "", "Ler um trecho em texto"),
          element("blockquote", "", `“${item.quote}”`),
        );
        caption.append(transcript);
      }
      card.append(button, caption);
      track.append(card);
    });
  }
  WhatsAppTestimonials(
    document.querySelector('[data-component="WhatsAppTestimonials"]'),
    config.whatsapp,
  );

  // One carousel controller serves authentic page samples and supplied feedback.
  document.querySelectorAll("[data-carousel]").forEach((track) => {
    const cards = [...track.children];
    if (!cards.length) return;
    const previous = document.querySelector(
      `[data-carousel-prev="${track.id}"]`,
    );
    const next = document.querySelector(`[data-carousel-next="${track.id}"]`);
    const status = document.querySelector(
      `[data-carousel-status="${track.id}"]`,
    );
    let current = 0,
      frame = 0;
    const update = () => {
      frame = 0;
      const left = track.getBoundingClientRect().left + track.clientLeft;
      current = cards.reduce(
        (best, card, i) =>
          Math.abs(card.getBoundingClientRect().left - left) <
          Math.abs(cards[best].getBoundingClientRect().left - left)
            ? i
            : best,
        0,
      );
      const overflow = track.scrollWidth > track.clientWidth + 2;
      previous.disabled = !overflow || current === 0;
      next.disabled =
        !overflow ||
        track.scrollLeft >= track.scrollWidth - track.clientWidth - 3;
      status.textContent = `${current + 1} de ${cards.length}`;
      track.setAttribute("aria-roledescription", "carrossel");
    };
    const go = (index, immediate = false) => {
      const target = cards[Math.max(0, Math.min(cards.length - 1, index))];
      track.scrollTo({
        left:
          track.scrollLeft +
          target.getBoundingClientRect().left -
          track.getBoundingClientRect().left -
          track.clientLeft,
        behavior: immediate || reduced.matches ? "instant" : "smooth",
      });
    };
    previous.addEventListener("click", () => go(current - 1));
    next.addEventListener("click", () => go(current + 1));
    track.addEventListener("keydown", (event) => {
      if (event.target !== track) return;
      const index = {
        ArrowLeft: current - 1,
        ArrowRight: current + 1,
        Home: 0,
        End: cards.length - 1,
      }[event.key];
      if (index !== undefined) {
        event.preventDefault();
        go(index);
      }
    });
    track.addEventListener(
      "scroll",
      () => {
        if (!frame) frame = requestAnimationFrame(update);
      },
      { passive: true },
    );
    // Preserve an aligned card when rotating a phone or crossing a breakpoint.
    window.addEventListener("resize", () => {
      go(current, true);
      update();
    });
    update();
  });

  const lightbox = document.getElementById("imageLightbox");
  const viewport = lightbox.querySelector(".lp-lightbox-viewport");
  const zoom = lightbox.querySelector("[data-lightbox-zoom]");
  let group = [],
    selectedImage = 0,
    imageTrigger;
  const showImage = (index) => {
    selectedImage = Math.max(0, Math.min(group.length - 1, index));
    const button = group[selectedImage],
      source = button.querySelector("img"),
      target = lightbox.querySelector("img");
    Object.assign(target, {
      src: button.dataset.full,
      alt: source.alt,
      width: source.width,
      height: source.height,
    });
    lightbox.querySelector("#lightbox-title").textContent =
      button.dataset.caption;
    lightbox.querySelector("[data-lightbox-status]").textContent =
      `${selectedImage + 1} de ${group.length}`;
    lightbox.querySelector("[data-lightbox-prev]").disabled =
      selectedImage === 0;
    lightbox.querySelector("[data-lightbox-next]").disabled =
      selectedImage === group.length - 1;
    viewport.classList.remove("is-zoomed");
    viewport.scrollTo(0, 0);
    zoom.setAttribute("aria-pressed", "false");
    zoom.textContent = "Ampliar 150%";
  };
  document.querySelectorAll("[data-zoom-group]").forEach((button) =>
    button.addEventListener("click", () => {
      if (document.querySelector("dialog[open]")) return;
      imageTrigger = button;
      group = [...document.querySelectorAll("[data-zoom-group]")].filter(
        (item) => item.dataset.zoomGroup === button.dataset.zoomGroup,
      );
      showImage(group.indexOf(button));
      lightbox.showModal();
    }),
  );
  lightbox
    .querySelector("[data-lightbox-prev]")
    .addEventListener("click", () => showImage(selectedImage - 1));
  lightbox
    .querySelector("[data-lightbox-next]")
    .addEventListener("click", () => showImage(selectedImage + 1));
  lightbox
    .querySelector("[data-close-lightbox]")
    .addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      showImage(selectedImage + (event.key === "ArrowRight" ? 1 : -1));
    }
  });
  zoom.addEventListener("click", () => {
    const active = viewport.classList.toggle("is-zoomed");
    zoom.setAttribute("aria-pressed", String(active));
    zoom.textContent = active ? "Ajustar à tela" : "Ampliar 150%";
  });
  lightbox.addEventListener("close", () => {
    lightbox.querySelector("img").removeAttribute("src");
    imageTrigger?.focus({ preventScroll: true });
  });

  const select = document.getElementById("journeySelect");
  select.replaceChildren(
    ...config.journeys.map(
      (item, index) => new Option(item.name, String(index)),
    ),
  );
  let selectedMantra = 0;
  const renderJourney = () => {
    const index = Number(select.value) || 0;
    const item = config.journeys[index] || config.journeys[0];
    const samples = site.content?.journeys[index]?.samples || [item];
    const sample = samples[selectedMantra % samples.length];
    document.getElementById("journeyMessage").textContent = sample.text;
    document.getElementById("journeyName").textContent = item.name;
    document.getElementById("journeySource").textContent =
      `Página ${String(sample.page ?? item.pdfPage).padStart(2, "0")} · Mantra ${String(sample.number ?? item.number).padStart(3, "0")}`;
    const frame = document.querySelector(".lp-journey-message");
    frame.classList.remove("is-changing");
    requestAnimationFrame(() => frame.classList.add("is-changing"));
  };
  select.addEventListener("change", () => {
    selectedMantra = 0;
    renderJourney();
  });
  document.querySelector("[data-next-mantra]").addEventListener("click", () => {
    selectedMantra++;
    renderJourney();
  });
  renderJourney();
  const pause = document.querySelector("[data-toggle-journeys]");
  pause.addEventListener("click", () => {
    const active = pause.getAttribute("aria-pressed") !== "true";
    pause.setAttribute("aria-pressed", String(active));
    pause.textContent = active
      ? "Retomar movimento das jornadas"
      : "Pausar movimento das jornadas";
    document
      .querySelector(".lp-ticker-track")
      .classList.toggle("is-paused", active);
  });

  // Absolute campaign time. No timestamp is generated or persisted for visitors.
  let campaignTimer;
  const campaignTick = () => {
    const value = window.MantrasCampaign.read(promotion.endsAt);
    const counter = document.getElementById("promotionCountdown");
    counter.hidden = !value;
    document.querySelector("[data-campaign-message]").textContent = value
      ? "Condição disponível até o prazo configurado:"
      : promotion.neutralMessage;
    if (!value) {
      clearInterval(campaignTimer);
      return;
    }
    for (const key of ["hours", "minutes", "seconds"])
      counter.querySelector(`[data-${key}]`).textContent = value[key];
    counter.setAttribute(
      "aria-label",
      `${value.hours} horas, ${value.minutes} minutos e ${value.seconds} segundos restantes na campanha`,
    );
  };
  const startCampaign = () => {
    clearInterval(campaignTimer);
    campaignTick();
    if (window.MantrasCampaign.read(promotion.endsAt))
      campaignTimer = setInterval(campaignTick, 1000);
  };
  startCampaign();

  // Popup timing and analytics are independent. No consent or tracking is inferred.
  const modal = document.getElementById("exitOffer"),
    video = document.getElementById("productVideo");
  const sessionKey = "mantras.offer-popup.v1";
  let checkout = false,
    leaving = false,
    focusBeforePopup;
  try {
    checkout =
      sessionStorage.getItem("mantras.checkout-navigation.v1") === "true";
  } catch {
    /* Storage is optional. */
  }
  const initialTime = performance.now();
  const scheduler = new window.MantrasPopupScheduler({
    config: popupConfig,
    now: () => performance.now(),
    getCount: () => {
      try {
        return sessionStorage.getItem(sessionKey);
      } catch {
        return 0;
      }
    },
    setCount: (count) => {
      try {
        sessionStorage.setItem(sessionKey, String(count));
      } catch {
        /* Memory guard still applies. */
      }
    },
    canOpen: () =>
      !leaving &&
      !checkout &&
      !document.hidden &&
      !document.querySelector("dialog[open]") &&
      !(popupConfig.pauseWhileVideoPlaying && video && !video.paused) &&
      !document.activeElement?.matches("input,textarea,select"),
    onOpen: (reason) => {
      focusBeforePopup = document.activeElement;
      modal.dataset.openedAt = String(performance.now());
      modal.dataset.displayCount = String(scheduler.count);
      modal.dataset.reason = reason;
      modal.showModal();
    },
  });
  const sync = () => scheduler.sync();
  const observer = new MutationObserver(sync);
  const observeDialogs = () =>
    document.querySelectorAll("dialog").forEach((dialog) =>
      observer.observe(dialog, {
        attributes: true,
        attributeFilter: ["open"],
      }),
    );
  observeDialogs();
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("focusin", sync);
  document.addEventListener("focusout", () => queueMicrotask(sync));
  for (const name of ["play", "pause", "ended"])
    video?.addEventListener(name, sync);
  const stopForCheckout = (event) => {
    if (!event.target.closest?.("a[data-checkout]")) return;
    checkout = true;
    try {
      sessionStorage.setItem("mantras.checkout-navigation.v1", "true");
    } catch {
      /* In-memory stop still applies. */
    }
    scheduler.stop();
  };
  document.addEventListener("pointerdown", stopForCheckout, true);
  document.addEventListener("click", stopForCheckout, true);
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") stopForCheckout(event);
    },
    true,
  );
  document.addEventListener("mouseout", (event) => {
    if (
      popupConfig.exitIntentEnabled &&
      matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !event.relatedTarget &&
      event.clientY <= 0 &&
      performance.now() - initialTime >= popupConfig.initialDelayMs
    )
      scheduler.requestOpen("exit");
  });
  modal.querySelectorAll("[data-close-exit]").forEach((button) =>
    button.addEventListener("click", () => {
      if (button.hasAttribute("data-popup-continue")) {
        scheduler.stop();
        try {
          sessionStorage.setItem("mantras.popup-continue.v1", "true");
        } catch {
          /* In-memory stop still applies. */
        }
      }
      modal.close();
    }),
  );
  modal.addEventListener("close", () => {
    modal.dataset.closedAt = String(performance.now());
    if (
      focusBeforePopup?.isConnected &&
      focusBeforePopup.matches(
        "a[href],button,input,select,textarea,[tabindex]",
      )
    )
      focusBeforePopup.focus({ preventScroll: true });
    else document.querySelector("#heroCheckout").focus({ preventScroll: true });
    scheduler.closed();
  });
  window.addEventListener("pagehide", () => {
    leaving = true;
    scheduler.pause();
    clearInterval(campaignTimer);
    observer.disconnect();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      leaving = false;
      observeDialogs();
      startCampaign();
      sync();
    }
  });
  let continued = false;
  try {
    continued = sessionStorage.getItem("mantras.popup-continue.v1") === "true";
  } catch {
    /* Storage is optional. */
  }
  if (popupConfig.enabled === false || continued) scheduler.stop();
  else scheduler.sync();
})();

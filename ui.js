(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const gallery = document.getElementById("previewGallery");
  const pages = gallery ? [...gallery.querySelectorAll(".page-preview")] : [];

  if (gallery && pages.length) {
    const previous = document.querySelector("[data-gallery-prev]");
    const next = document.querySelector("[data-gallery-next]");
    const status = document.querySelector("[data-gallery-status]");
    const controls = document.querySelector("[data-gallery-controls]");
    const indicators = [...document.querySelectorAll("[data-gallery-page]")];
    let currentPage = 0;
    let scrollFrame = 0;

    function updateGallery() {
      const galleryLeft = gallery.getBoundingClientRect().left + gallery.clientLeft;
      const overflow = gallery.scrollWidth > gallery.clientWidth + 2;
      let shortestDistance = Infinity;
      pages.forEach((page, index) => {
        const distance = Math.abs(page.getBoundingClientRect().left - galleryLeft);
        if (distance < shortestDistance) {
          shortestDistance = distance;
          currentPage = index;
        }
      });
      if (controls) controls.hidden = !overflow;
      if (previous) previous.disabled = !overflow || currentPage === 0;
      if (next) next.disabled = !overflow || currentPage === pages.length - 1;
      const description = `${currentPage + 1} de ${pages.length}`;
      if (status && status.textContent !== description) status.textContent = description;
      indicators.forEach((indicator) => {
        if (Number(indicator.dataset.galleryPage) === currentPage) indicator.setAttribute("aria-current", "true");
        else indicator.removeAttribute("aria-current");
      });
    }

    function goToPage(index) {
      const page = pages[Math.max(0, Math.min(pages.length - 1, index))];
      const target = gallery.scrollLeft + page.getBoundingClientRect().left
        - gallery.getBoundingClientRect().left - gallery.clientLeft;
      gallery.scrollTo({ left: target, behavior: reducedMotion.matches ? "instant" : "smooth" });
    }

    previous?.addEventListener("click", () => goToPage(currentPage - 1));
    next?.addEventListener("click", () => goToPage(currentPage + 1));
    indicators.forEach((indicator) => {
      indicator.addEventListener("click", () => goToPage(Number(indicator.dataset.galleryPage)));
    });
    gallery.addEventListener("keydown", (event) => {
      if (event.target !== gallery || gallery.scrollWidth <= gallery.clientWidth + 2) return;
      const target = { ArrowLeft: currentPage - 1, ArrowRight: currentPage + 1, Home: 0, End: pages.length - 1 }[event.key];
      if (target === undefined) return;
      event.preventDefault();
      goToPage(target);
    });
    gallery.addEventListener("scroll", () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        updateGallery();
      });
    }, { passive: true });
    window.addEventListener("resize", updateGallery);
    updateGallery();
  }

  const purchaseBar = document.getElementById("mobilePurchaseBar");
  const hero = document.getElementById("inicio");
  const footer = document.getElementById("rodape");
  const faq = document.getElementById("duvidas");
  const consentDialog = document.getElementById("consentPreferences");

  // The regular CTAs remain usable when observers or JavaScript are unavailable.
  if (!purchaseBar || !hero || !("IntersectionObserver" in window)) return;

  const mobile = window.matchMedia("(max-width: 767px)");
  const regularCtas = [...document.querySelectorAll("a[data-checkout]")]
    .filter((link) => !purchaseBar.contains(link));
  const visibleCtas = new Set();
  let footerVisible = false;
  let faqVisible = false;

  function updatePurchaseBar() {
    const visible = mobile.matches && hero.getBoundingClientRect().bottom <= 0
      && !visibleCtas.size && !footerVisible && !faqVisible && !consentDialog?.open;
    purchaseBar.hidden = !visible;
    document.body.classList.toggle("mobile-purchase-visible", visible);
  }

  const ctaObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visibleCtas.add(entry.target);
      else visibleCtas.delete(entry.target);
    });
    updatePurchaseBar();
  }, { rootMargin: "0px 0px 88px 0px", threshold: 0 });
  regularCtas.forEach((link) => ctaObserver.observe(link));

  const heroObserver = new IntersectionObserver(updatePurchaseBar, { threshold: 0 });
  heroObserver.observe(hero);

  if (footer) {
    const footerObserver = new IntersectionObserver((entries) => {
      footerVisible = entries.some((entry) => entry.isIntersecting);
      updatePurchaseBar();
    }, { rootMargin: "0px 0px 88px 0px", threshold: 0 });
    footerObserver.observe(footer);
  }

  if (faq) {
    const faqObserver = new IntersectionObserver((entries) => {
      faqVisible = entries.some((entry) => entry.isIntersecting);
      updatePurchaseBar();
    }, { rootMargin: "0px 0px 88px 0px", threshold: 0 });
    faqObserver.observe(faq);
  }

  if (consentDialog) {
    new MutationObserver(updatePurchaseBar).observe(consentDialog, { attributes: true, attributeFilter: ["open"] });
  }
  mobile.addEventListener("change", updatePurchaseBar);
  window.addEventListener("resize", updatePurchaseBar);
  updatePurchaseBar();
})();

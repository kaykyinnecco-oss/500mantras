(() => {
  "use strict";
  const track = document.getElementById("readerReviews");
  if (!track) return;
  const cards = [...track.querySelectorAll(".review-card")];
  const previous = document.querySelector("[data-review-prev]");
  const next = document.querySelector("[data-review-next]");
  const status = document.querySelector("[data-review-status]");
  const controls = document.querySelector("[data-review-controls]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let index = 0;
  let frame = 0;

  function update() {
    const overflow = track.scrollWidth > track.clientWidth + 2;
    const left = track.getBoundingClientRect().left + track.clientLeft;
    let nearest = Infinity;
    cards.forEach((card, position) => {
      const distance = Math.abs(card.getBoundingClientRect().left - left);
      if (distance < nearest) { nearest = distance; index = position; }
    });
    controls.hidden = !overflow;
    previous.disabled = !overflow || index === 0;
    next.disabled = !overflow || index === cards.length - 1;
    const label = (index + 1) + " de " + cards.length;
    if (status.textContent !== label) status.textContent = label;
    track.setAttribute("aria-roledescription", overflow ? "carrossel" : "lista de avaliações");
  }
  function move(position) {
    const card = cards[Math.max(0, Math.min(cards.length - 1, position))];
    const left = track.scrollLeft + card.getBoundingClientRect().left
      - track.getBoundingClientRect().left - track.clientLeft;
    track.scrollTo({ left, behavior: reducedMotion.matches ? "instant" : "smooth" });
  }
  previous.addEventListener("click", () => move(index - 1));
  next.addEventListener("click", () => move(index + 1));
  track.addEventListener("keydown", (event) => {
    if (event.target !== track || track.scrollWidth <= track.clientWidth + 2) return;
    const position = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: cards.length - 1 }[event.key];
    if (position === undefined) return;
    event.preventDefault();
    move(position);
  });
  track.addEventListener("scroll", () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => { frame = 0; update(); });
  }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();

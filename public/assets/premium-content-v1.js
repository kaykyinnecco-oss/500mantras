// Editorial configuration. Never publish metrics/photos without documented authorization.
window.MANTRAS_CONTENT = Object.freeze({
  promotion: { endsAt: null }, // ISO date with timezone, only for a real campaign.
  rating: { target: 4.8, publish: false, count: null, source: "", avatars: [] },
  // {src, alt, authorized:true}; empty avatars reserve the component, not fake buyers.
  whatsapp: [],
  // {src, alt, name, date, order, authorized:true, privacyReviewed:true}
  // Use an already-redacted image; do not ship originals containing personal data.
  journeys: [
    { name: "Amor-próprio e autoestima", text: "Eu mereço o mesmo cuidado que ofereço às pessoas que amo.", source: "Página 07 · Mantra 001" },
    { name: "Prosperidade e abundância", text: "Eu reconheço as oportunidades que surgem quando me preparo para percebê-las.", source: "Página 19 · Mantra 051" },
    { name: "Gratidão e conexão com o universo", text: "Hoje percebo a beleza de uma coisa simples que normalmente passa despercebida.", source: "Página 43 · Mantra 151" }
  ]
});

// Shared publication rules keep pending content out of the public interface.
window.MANTRAS_CONTENT_POLICY = Object.freeze({
  ratingIsPublishable(data) {
    return data.publish === true && typeof data.source === "string" && data.source.trim().length > 0
      && Number.isFinite(data.target) && data.target >= 0 && data.target <= 5;
  },
  imageIsLocal(value) {
    return typeof value === "string" && /^\/assets\/[\w/ .-]+\.(?:webp|png|jpe?g|avif)$/i.test(value) && !value.includes("..");
  },
  approvedAvatars(items) {
    return items.filter((item) => item.authorized === true && this.imageIsLocal(item.src));
  },
  approvedTestimonials(items) {
    return items.filter((item) => item.authorized === true && item.privacyReviewed === true
      && typeof item.alt === "string" && item.alt.trim() && this.imageIsLocal(item.src))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }
});

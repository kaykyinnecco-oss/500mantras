// Selected Lucide icons (ISC). https://lucide.dev/license
const shapes = {
  'heart': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/>',
  'book-open': '<path d="M12 7v14m0-14C9 5 5 4 2 5v15c3-1 7 0 10 1m0-14c3-2 7-3 10-2v15c-3-1-7 0-10 1"/>',
  'sparkles': '<path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2ZM19 2v4m-2-2h4"/>',
  'smartphone': '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  'layers': '<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  'compass': '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.4 6-6 2.4 2.4-6Z"/>',
  'leaf': '<path d="M20 4c-7-1-14 1-15 7a7 7 0 0 0 8 8c6-1 7-8 7-15ZM4 21l10-10"/>',
  'lock': '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'shield-check': '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  'check': '<path d="m20 6-11 11-5-5"/>',
  'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  'arrow-right': '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M7 7h10v10"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'x': '<path d="m18 6-12 12M6 6l12 12"/>',
  'zoom-in': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M8 11h6m-3-3v6"/>',
  'play': '<path d="m8 5 11 7-11 7Z"/>',
  'star': '<path d="m12 3 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9Z"/>',
};
export const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#icon-${name}"/></svg>`;
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function renderContent(source, site) {
  const { journeys, gallery, testimonials } = site.content;
  const first = journeys[0];
  const names = journeys.map((journey) => `<span>${icon('sparkles')}${escape(journey.title)}</span>`).join('');
  const testimonialSection = testimonials.length ? `<section class="section testimonials-section" id="whatsapp-testimonials" data-component="WhatsAppTestimonials" aria-labelledby="testimonials-title"><div class="section-shell"><header class="carousel-heading"><div class="section-heading"><p class="eyebrow">EXPERIÊNCIAS COMPARTILHADAS</p><h2 id="testimonials-title">Pequenas pausas.<span>Relatos de quem leu.</span></h2><p>Mensagens recebidas pelo WhatsApp e fornecidas para apresentação do material. Toque para ampliar cada conversa.</p></div><div class="carousel-controls"><button type="button" data-carousel-target="testimonialsCarousel" data-carousel-step="-1" aria-controls="testimonialsCarousel" aria-label="Depoimento anterior">${icon('chevron-left')}</button><span data-carousel-status="testimonialsCarousel" aria-live="polite">1 de ${testimonials.length}</span><button type="button" data-carousel-target="testimonialsCarousel" data-carousel-step="1" aria-controls="testimonialsCarousel" aria-label="Próximo depoimento">${icon('chevron-right')}</button></div></header><div class="carousel-track testimonials-carousel" id="testimonialsCarousel" data-carousel tabindex="0" role="region" aria-roledescription="carrossel" aria-label="Prints de depoimentos fornecidos">${testimonials.map((item, index) => `<figure class="testimonial-card"><button type="button" data-image-group="testimonials" data-image-index="${index}" aria-label="Ampliar mensagem de ${escape(item.name)}"><img src="${escape(item.thumbnail)}" width="${item.thumbnailWidth}" height="${item.thumbnailHeight}" alt="${escape(item.alt)}" loading="lazy" decoding="async"><span class="zoom-label">${icon('zoom-in')}Ampliar conversa</span></button><figcaption><strong>${escape(item.name)}</strong><span>Relato compartilhado pelo WhatsApp</span></figcaption></figure>`).join('')}</div></div></section>` : '';
  const replacements = {
    '__ICONS__': `<svg class="svg-definitions" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${Object.entries(shapes).map(([name, paths]) => `<symbol id="icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</symbol>`).join('')}</defs></svg>`,
    '__RATING_STARS__': Array.from({length:5}, () => icon('star')).join(''),
    '__JOURNEY_TICKER__': `<div class="journey-group">${names}</div><div class="journey-group">${names}</div>`,
    '__JOURNEY_LIST__': `<ol class="visually-hidden">${journeys.map((journey) => `<li>${escape(journey.title)}</li>`).join('')}</ol>`,
    '__GALLERY__': gallery.map((item,index) => `<figure class="preview-card"><button type="button" data-image-group="ebook" data-image-index="${index}" aria-label="Ampliar ${escape(item.title)}"><img src="${escape(item.thumbnail)}" width="${item.thumbnailWidth}" height="${item.thumbnailHeight}" alt="${escape(item.alt)}" loading="lazy" decoding="async"><span class="zoom-label">${icon('zoom-in')}Ver página completa</span></button><figcaption><span class="page-label">PÁGINA ${String(item.page).padStart(3,'0')}</span><strong>${escape(item.title)}</strong></figcaption></figure>`).join(''),
    '__JOURNEY_OPTIONS__': journeys.map((journey) => `<option value="${escape(journey.id)}">${String(journey.number).padStart(2,'0')} · ${escape(journey.title)}</option>`).join(''),
    '__MANTRA_TEXT__': escape(first.samples[0].text),
    '__MANTRA_NUMBER__': 'Mantra ' + String(first.samples[0].number).padStart(3,'0'),
    '__MANTRA_JOURNEY__': escape(first.title),
    '__TESTIMONIAL_SECTION__': testimonialSection,
    '__GUARANTEE_INLINE__': site.guarantee.confirmed ? `Garantia de ${site.guarantee.days} dias` : 'Compra única',
    '__GUARANTEE_SECTION__': site.guarantee.confirmed ? `<section class="section section-light guarantee-section" id="garantia" aria-labelledby="guarantee-title"><div class="section-shell guarantee-layout"><div class="guarantee-seal"><img src="/assets/selo-garantia-premium-7-dias-v1.webp" width="640" height="640" alt="Garantia de ${site.guarantee.days} dias" loading="lazy" decoding="async"></div><div class="guarantee-copy reveal"><p class="eyebrow">TRANQUILIDADE PARA CONHECER O MATERIAL</p><h2 id="guarantee-title">Você tem ${site.guarantee.days} dias<span>para conhecer o seu e-book.</span></h2><p>Se decidir solicitar o reembolso, entre em contato em até ${site.guarantee.days} dias após a compra. Nossa equipe orienta você pelo canal de atendimento.</p><a class="text-button" href="mailto:${escape(site.supportEmail)}">Falar com o atendimento ${icon('arrow-up-right')}</a></div></div></section>` : '',
    '__GUARANTEE_FAQ__': site.guarantee.confirmed ? `<details><summary>Como funciona a garantia de ${site.guarantee.days} dias?</summary><p>Você pode solicitar o reembolso em até ${site.guarantee.days} dias após a compra. Entre em contato pelo <a href="mailto:${escape(site.supportEmail)}">e-mail de suporte</a> e siga as orientações da equipe. Veja também os <a href="/termos">termos de uso</a>.</p></details>` : '',
  };
  for (const [key,value] of Object.entries(replacements)) source = source.replaceAll(key,value);
  return source;
}

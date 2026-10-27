# Capa premium do vídeo

Fonte oficial fornecida pelo proprietário: “Uma Pausa Para Você_ 500 Mantras.png”, 1672 × 941, 2.039.213 bytes. SHA-256: 3e8923055acbe002f1605b8f6ff58a5f20b2288bdd23a27f2b5029b3a42cc586.

Arquivo final: public/assets/video-poster-500-mantras-v1.webp, 1200 × 675, 137.980 bytes, qualidade 90. Redimensionamento proporcional e codificação WebP com Sharp externo ao projeto, preservando a composição inteira. A arte não foi recriada.

Título e subtítulo usam os textos solicitados. A imagem é o poster nativo e também o conteúdo visual do botão funcional existente videoPlay. O botão transparente cobre toda a capa, inclusive a chamada desenhada, usa alt descritivo e foco visível e continua conectado ao mesmo listener de reprodução. Assim, a imagem inteira responde a clique/teclado e nenhum segundo ícone de play é desenhado. Ao reproduzir, a lógica original oculta a camada e libera o player e seus controles; se JavaScript estiver indisponível, o botão fica oculto e os controles nativos permanecem utilizáveis.

Contêiner 16:9 com cantos arredondados, contorno dourado e glow estático suave. Imagens usam object-fit contain. Preload none, playsinline, arquivo MP4, som, controles e eventos anteriores preservados. Sem autoplay, bibliotecas adicionais ou alterações nos scripts de rastreamento.

## Validação

- Build e npm test aprovados; sintaxe do teste JS e git diff --check aprovados.
- HTML fora da imagem/preload do hero e da seção do vídeo comparado byte a byte à main, normalizando apenas esses dois escopos autorizados. Todas as regras CSS alteradas pertencem ao hero ou ao vídeo. Demais seções, preços, garantia, CTAs, páginas legais e configurações preservados.
- Navegador controlado: 320, 375, 390, 430, 768 e 1440px. Capa carregada inteira, sem cortes, distorção ou overflow horizontal; título/subtítulo sem corte. Um único botão funcional e uma única instância do vídeo. A área mínima medida da capa clicável foi de 271 × 151px.
- Clique e Enter iniciam o vídeo; camada oculta após play. Pausa e retomada com o controle nativo de teclado verificadas, com controls true e muted false.
- Reprodução concluída em 39,83 segundos, sem erro de mídia; CTA de conclusão exibido e camada de capa oculta. Console observado sem erros ou avisos.
- Oito destinos de checkout preservados e script de consentimento/rastreamento intacto, conforme a suíte existente. Nenhuma compra executada.

A inspeção foi feita no navegador controlado disponível neste Windows. iPhone/Safari e aparelhos Android físicos não estavam disponíveis; a validação nesses aparelhos permanece complementar. Não se afirma teste físico, medição de Core Web Vitals nem auditoria de recebimento de eventos no Gerenciador da Meta. O runner opcional de navegador não foi executado. Commit, PR e status do deploy são registrados na entrega após verificação.

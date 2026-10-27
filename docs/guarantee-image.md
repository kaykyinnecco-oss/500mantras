# Selo oficial de garantia

Base: main 59fed11. Fonte fornecida pelo proprietário: `Selo Dourado Garantia de 7 Dias-Photoroom.png`, 1254 × 1254, 2.399.708 bytes. SHA-256 da fonte: `b5168c224bb0c8601e0c6de37013de1316f6f2a926113f87d580cac0258e67c3`.

O PNG recebido já possui transparência externa real. A arte foi redimensionada proporcionalmente e codificada em WebP 640 × 640, qualidade 94 e alphaQuality 100, com Sharp utilizado como ferramenta externa ao projeto. Arquivo final: `public/assets/selo-garantia-premium-7-dias-v1.webp`, 113.926 bytes, aproximadamente 95,3% menor. O build utiliza diretamente esse arquivo e mantém suas dependências atuais.

O mesmo arquivo é reutilizado em três pontos: abaixo do CTA da oferta (104px), na seção “Seu tempo para conhecer o material” (200px em mobile e 216px em desktop) e na faixa de credibilidade (96px). Todos usam o texto alternativo “Selo de garantia de 7 dias”, dimensões intrínsecas quadradas, lazy-loading e decodificação assíncrona. Os três SVGs antigos foram retirados dos assets públicos.

## Validação

- `npm run build`, `npm test`, `node --check` nos testes ajustados e `git diff --check`: aprovados.
- HTML comparado à main: conteúdo integralmente idêntico após normalizar apenas as três tags de imagem substituídas. Textos da garantia, prazo, informações legais, preços, CTAs, vídeo e demais seções preservados. Scripts, configurações e integrações mantêm os hashes protegidos verificados pela suíte existente.
- WebP decodificado: quatro canais, 142.829 pixels totalmente transparentes, quatro cantos com alpha 0 e centro roxo com alpha 255. Contorno suavizado e reflexos dourados preservados. Conferido também sobre fundo roxo; sem retângulo branco ou halo visível.
- Navegador controlado em 320, 360, 390, 414, 600, 768, 1024 e 1440px: três imagens carregadas, proporção 1:1, dentro dos respectivos contêineres, sem rolagem horizontal ou cortes no texto da garantia. Console sem erros ou avisos observados.
- Os oito CTAs continuam com o destino original. Os testes verificam reutilização do mesmo asset, alt acessível e ausência das referências e dos arquivos antigos no build.

O runner opcional `scripts/browser-test.mjs` teve apenas o seletor do asset atualizado e foi verificado sintaticamente. A inspeção visual foi feita pelo navegador controlado; a execução desse runner opcional não integra os resultados acima. Toque em aparelhos físicos não foi testado. Commit, PR e confirmação do deploy são registrados na entrega após a publicação.

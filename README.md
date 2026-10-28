# 500 Mantras para Elevar Sua Energia

Landing page premium em HTML, CSS e JavaScript nativos. Uma única arquitetura visual e componentes alimentados por conteúdo real do produto.

## Executar

Requer Node.js 20+.

```sh
npm run dev
npm run build
npm test
npm run preview
```

Desenvolvimento: http://localhost:4173 . Prévia do build: http://localhost:4174 . Alternativas sem npm: `node scripts/dev.mjs`, `node scripts/build.mjs`, `node scripts/smoke-test.mjs`, `node scripts/preview.mjs`.

Não há lint configurado. Validar sintaxe com `node --check app.js`, `node --check interactions.js` e os arquivos `.mjs` em scripts.

## Arquitetura

- `index.html`: estrutura semântica única, com um Hero e um encerramento institucional.
- `styles.css`: única folha, roxo/amethyst/champagne/off-white, CTAs verdes; fontes locais Lora Semibold e Source Sans 3.
- `app.js`: integrações existentes: checkout, UTMs, consentimento, Pixel, FAQ e vídeo.
- `interactions.js`: cronômetro, pop-up, galeria/lightbox, carrosséis, pausa das jornadas, explorador e composição de prova social.
- `scripts/render-content.mjs`: resolve os componentes editoriais no build e no servidor de desenvolvimento. O conteúdo principal continua disponível sem JavaScript.
- `data/product-content.json`: títulos originais das 10 jornadas,30 mantras de amostra com fonte,7 prévias e 5 prints fornecidos.
- `site.config.json`: configuração comercial, métricas, prazo de campanha e frequência da oferta.

CSS, app e interactions usam nomes com hash de conteúdo na produção. As antigas folhas de tema e scripts de apresentação foram removidos, inclusive ui.js, a barra móvel antiga e o carrossel de reviews anterior. Detalhes da auditoria em `docs/premium-review-2026-10-28.md`.

## Configuração comercial

O checkout original permanece `https://pay.cakto.com.br/323 zgdr_1243414`, preçoR$ 9,90 e Meta Pixel 2429955871112248. O checkout é validado como HTTPS em domínio oficial Cakto. O suporte, preço, taxa e snapshotPIX ficam na configuração.

Os overrides de build existentes continuam disponíveis: `NEXT_PUBLIC_CAKTO_CHECKOUT_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA 4_MEASUREMENT_ID`.

As parcelas antigas de outro preço foram removidas da configuração. A página não anuncia parcelamento fixo: taxas e total são apresentados no checkout. Os três complementos são opcionais, cobrados separadamente e explicitamente fora do e-book principal.

A garantia de 7 dias foi confirmada pelo proprietário. `guarantee.confirmed` controla a publicação do componente de garantia, com duração em `guarantee.days`.

## Campanha e pop-up

`campaign.endsAt` é **null** por ausência de um prazo real informado. A faixa fica visível com mensagem neutra e preço; não há contagem regressiva inventada. Para uma campanha real, informe uma dataISO absoluta com timezone (por exemplo, o formato `AAAA-MM-DDTHH:mm:ss-03:00`). `message` e `expiredMessage` controlam os textos. O relógio não reinicia por visitante e deixa de anunciar prazo quando expira.

```json
{
  "popup": {
    "enabled": true,
    "initialDelayMs": 6000,
    "repeatDelayMs": 4000,
    "exitIntentEnabled": true,
    "repeatEnabled": true,
    "maxDisplaysPerSession": 3
  }
}
```

O tempo conta com a aba visível e sem outro diálogo ativo. Fechar inicia o próximo intervalo. Há um único temporizador, limite por sessão, suporte a Escape e retorno de foco. Clique no checkout suspende a oferta durante a navegação; pagehide cancela timers e pageshow restaura o estado. Desative `repeatEnabled` ou ajuste o limite para alterar a frequência. Nenhum desconto adicional é alegado pelo pop-up.

## Conteúdo e privacidade

As prévias foram extraídas do PDF fornecido pelo proprietário. O PDF completo pago não integra `public` nem `dist`. A capa e as páginas reais compõem os mockups em CSS, sem alterar os textos das artes. Os cinco prints foram fornecidos pelo usuário e otimizados sem fabricar conversas. Os dados não lhes atribuem nota nem compra verificada.

`socialProof.avatars` começa vazio e `rating`/`ratingCount` nulos. O componente `SocialProofRating` está integrado e só se torna visível com fotos reais ou uma avaliação explicitamente validada (`verified:true`). Para adicionar fotos, use `{src,alt}` em `avatars`; use assets próprios/autorizados. Nenhuma imagem de fixture ou nota de teste é publicada. `WhatsAppTestimonials` é renderizado a partir de `content.testimonials` e fica ausente quando não existem prints.

Rastreamento opcional permanece desligado até aceite válido. As preferências são abertas pelo rodapé, sem banner automático de cookies. O registro v2 tem validade de 180 dias. Rejeição e revogação bloqueiam eventos; revogação descarrega os SDKs. PageView, InitiateCheckout, OfferViewed e eventos de vídeo são preservados, com um único proprietário de analytics. Não há Purchase simulado no frontend.

A apresentação visual H.264 de 18,5 segundos (531 KB), sem narração e sem preço gravado, usa apenas páginas reais da edição premium. É carregada sob demanda, com playsinline e faststart. Os vídeos anteriores permanecem no Git, fora do build, pois ainda exibiam o preço antigo. Servidores locais e Vercel permitem requisições de byte ranges para reprodução e busca.

## QA e capturas

```sh
node scripts/premium-test.mjs
```

Ou `node scripts/browser-test.mjs`, que aponta para a mesma suíte. Requer Playwright no ambiente de QA e um servidor de prévia. Bibliotecas e binários de teste nunca entram no build.

Variáveis opcionais: `BASE_URL`, `PLAYWRIGHT_MODULE_PATH`, `CHROMIUM_EXECUTABLE_PATH`, `QA_OUTPUT_DIR`. Use `QA_BROWSER=webkit` para o motor WebKit oficial, instalado em `PLAYWRIGHT_BROWSERS_PATH` (default `node_modules/.cache/ms-playwright`).

A suíte verifica 320/375/390/430/768/1024/1440 px: duplicações, fontes, overflow, CTAs, modais, swipe, teclado, foco, temporizadores 6/4 s, pausa/background/conflitos/checkout, campanha real simulada e expiração, galeria real, explorador, prova social preparada, consentimento e Pixel sem eventos falsos. Fixtures são interceptadas somente no processo de teste; não modificam a publicação.

Capturas antes/depois e relatórios ficam em `node_modules/.cache/premium-qa/`, fora do Git. Chromium/WebKit emulados não substituem a conferência em um iPhone físico. Não foram alegados resultados de conversão medidos nem pontuações de Core Web Vitals.

## Revisão e publicação

Trabalho em branch `codex/premium-reference-rebuild` e Pull Request para revisão. **Não realizar merge nem deploy de produção sem autorização do usuário.** Uma prévia criada automaticamente pela integração Git da Vercel é apenas ambiente de revisão.

Fontes e licenças locais preservadas em `public/assets/fonts`. Ícones adaptados de Lucide/Feather; licença em `public/third-party-licenses.txt`.


Ao substituir imagens por uma edição futura, use novos nomes de arquivo e atualize src/thumbnail nos dados para não reutilizar uma URL com cache longa.

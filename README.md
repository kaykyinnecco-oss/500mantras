# 500 Mantras para Elevar Sua Energia

Landing page mobile-first em HTML, CSS e JavaScript nativos, sem dependências de front-end. Identidade roxo profundo, dourado e creme; logo, mockup e páginas internas originais preservados.

## Executar e validar

Requer Node.js 20 ou superior. Os scripts também podem ser executados diretamente com Node:

```sh
npm run dev
npm run build
npm test
npm run preview
```

Desenvolvimento: http://localhost:4173. Prévia do build: http://localhost:4174. Os dois servidores locais suportam HEAD e requisições de intervalo de bytes para iniciar e buscar trechos do MP4, inclusive no WebKit.

Não há lint configurado. A sintaxe pode ser validada com `node --check app.js` e `node --check scripts/arquivo.mjs`.

## Jornada e apresentação

- Hero curto: produto digital, 500 mantras, 10 temas, 127 páginas, preço e compra.
- Identificação com a rotina e três formas práticas de usar o PDF.
- Três páginas reais: galeria nativa por deslize no celular, composição escalonada no desktop, sem modal de ampliação. Funciona por toque e teclado.
- Benefícios breves, amostra textual autêntica e os dez temas originais.
- Apresentação em vídeo sob demanda, com controles nativos e reprodução inline.
- Vídeo H.264/AAC 720p com faststart: 3,95 MB, redução de 95,4% em relação aos 85,77 MB originais. O original permanece no repositório; o build publica apenas a versão otimizada.
- Oferta em áreas de cores distintas: produto e números; benefícios; preço, pagamento único e CTA. Taxas e total são esclarecidos antes da confirmação no checkout.
- FAQ nativo compacto e chamada final.

A página usa fontes do sistema, imagens WebP com dimensões reservadas, CSS/JS com hash de conteúdo e carregamento adiado de scripts. Revelações usam apenas opacity/transform e respeitam prefers-reduced-motion. Não há movimento contínuo ou CTA fixo cobrindo a leitura.

## Checkout e suporte

Preço, checkout Cakto e contato ficam em `site.config.json`. Os valores comerciais existentes foram preservados. O build aceita estes overrides:

- NEXT_PUBLIC_CAKTO_CHECKOUT_URL
- NEXT_PUBLIC_SUPPORT_EMAIL
- NEXT_PUBLIC_META_PIXEL_ID
- NEXT_PUBLIC_GA4_MEASUREMENT_ID

O domínio do checkout precisa ser cakto.com.br ou um subdomínio oficial com HTTPS. Os sete CTAs usam o mesmo checkout e encaminham src, sck e UTMs da visita. Nenhum dado de pagamento é coletado nesta página.

## Privacidade e métricas

O controle Preferências de cookies fica no rodapé e nas páginas legais. O diálogo só abre mediante ação do visitante. Sem escolha, com rejeição ou com registro inválido/expirado, nenhum SDK opcional é carregado. Fechar o diálogo não autoriza rastreamento.

Uma escolha explícita salva um registro versionado em `mantras.analytics.consent.v2` por até 180 dias. Aceites legados sem data não habilitam tracking. Revogar bloqueia novos eventos, revoga consentimento nos SDKs já carregados, remove cookies opcionais acessíveis no domínio e recarrega para descarregar seus listeners. A preferência também se sincroniza entre abas. Sem armazenamento, a escolha vale só na página aberta.

Meta Pixel público: **2429955871112248**. Após consentimento válido, preservam-se PageView, OfferViewed, InitiateCheckout e eventos de vídeo. A inicialização e a visualização da oferta têm proteção contra duplicação. O clique informa o preço do e-book, R$ 9,90, e não é enviado como Purchase. Compras confirmadas devem continuar sendo medidas pela integração real da Cakto.

O experimento de copy permanece desativado. Sua configuração opcional está em `site.config.json`; uma variante só é aplicada e atribuída quando `experiment.enabled` é true e lp_variant corresponde a uma variante conhecida.

## Testes de navegador

```sh
node scripts/browser-test.mjs
```

Requer Playwright disponível no ambiente de QA e a prévia em execução. Nenhuma biblioteca de teste é enviada no build. É possível informar `PLAYWRIGHT_MODULE_PATH`, `CHROMIUM_EXECUTABLE_PATH`, `BASE_URL` e `QA_OUTPUT_DIR`. Use `QA_BROWSER=webkit` para testar o motor do Safari, com o WebKit oficial instalado pelo Playwright em `PLAYWRIGHT_BROWSERS_PATH` (por padrão, `node_modules/.cache/ms-playwright`).

A suíte verifica 320, 375, 390, 430, 768 e 1440 px; overflow, imagens, galeria completa e teclado, CTAs, consentimento, revogação, eventos únicos, UTMs, FAQ, movimento normal/reduzido, reflow equivalente a zoom de 200%, reprodução inline e byte ranges do vídeo. Os serviços de analytics são simulados para não enviar eventos de teste reais. Capturas e relatórios ficam em `node_modules/.cache/browser-qa` e `browser-qa-webkit`, fora do Git.

Emulação de navegador não substitui a conferência em um iPhone físico.

## Publicação

`vercel.json` configura o build estático em `dist` e as rotas /privacidade e /termos. A integração Git da Vercel publica main automaticamente. Antes da publicação, rode build, smoke e a revisão de navegador. Preserve a configuração comercial e confirme o SHA do deploy e os arquivos com hash servidos em produção.

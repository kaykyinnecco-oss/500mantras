# 500 Mantras para Elevar Sua Energia

Landing page de venda estática, responsiva e sem dependências de front-end. A página usa HTML, CSS e JavaScript nativos para manter a entrega leve e simples de publicar na Vercel.

## Executar localmente

Requer Node.js 20 ou superior. Na pasta do projeto:

npm run dev

Abra http://localhost:4173. Para conferir a versão de produção:

npm run build
npm test
npm run preview

A prévia de produção fica em http://localhost:4174.

## Estrutura da página

- Faixa superior contínua, com suporte a prefers-reduced-motion.
- Hero com conteúdo específico do produto, mockup e checkout antes da imagem no mobile.
- Bloco curto de identificação e três momentos de uso.
- Galeria ampliável de três páginas reais, mantra de amostra e os dez temas conferidos no PDF.
- Oferta com entregáveis, 127 páginas, preço de R$ 19,90 e contato de suporte.
- FAQ compacto, fechamento e rodapé com políticas e suporte.

Esta versão não contém vídeo nem seção de VSL.

## Checkout e suporte

O checkout da Cakto, e-mail de suporte, preço, taxa de serviço atual e total do PIX ficam em site.config.json. O checkout e suporte podem ser substituídos no ambiente de build por:

- NEXT_PUBLIC_CAKTO_CHECKOUT_URL
- NEXT_PUBLIC_SUPPORT_EMAIL
- NEXT_PUBLIC_META_PIXEL_ID
- NEXT_PUBLIC_GA4_MEASUREMENT_ID

O build valida que o checkout é um endereço HTTPS em domínio oficial da Cakto. Todos os botões de compra apontam para a mesma URL e recebem os parâmetros src, sck e UTMs presentes na página.

## Analytics e conversões

Meta Pixel e GA4 só carregam depois do consentimento quando os respectivos IDs estiverem configurados. A página envia view_offer uma vez ao exibir a oferta e begin_checkout ao clicar em um CTA. O valor desse evento é o preço do e-book (sem a taxa da Cakto ou eventuais custos de parcelamento), pois o método de pagamento ainda não foi escolhido; nenhum clique é tratado como compra.

Configure a confirmação de compra na plataforma de pagamentos para medir vendas aprovadas. A página não simula nem envia um evento Purchase.

## Teste A/B de copy

A variante atual é o controle. A configuração opcional fica em `site.config.json`, em `experiment.variants`; o experimento permanece desativado até que `experiment.enabled` seja alterado para `true`. Para comparar a variante preparada, use `?lp_variant=variante-b`. Hero, CTA e título/CTA da oferta podem ser ajustados pelos slots `data-copy-slot` sem alterar o layout. A variante é anexada ao `utm_content` do checkout e às propriedades de analytics, quando consentimento e IDs estiverem configurados. Para atribuir compras aprovadas, use a integração de conversão da Cakto; cliques continuam registrados como início de checkout, não como compra.

## Publicar na Vercel

Importe o repositório na Vercel. vercel.json define node scripts/build.mjs como comando de build e dist como diretório de saída. Configure as variáveis de ambiente necessárias antes de campanhas.

## Revisar antes de publicar

- Confirmar na Cakto o preço, a taxa de serviço, o total, as condições de acesso, a entrega do arquivo e as políticas apresentadas no checkout. Na verificação atual, PIX e PicPay mostraram R$ 19,90 pelo produto + R$ 0,99 de taxa = R$ 20,89; no cartão, o total depende do parcelamento (a opção inicial de 4 parcelas mostrou 4 × R$ 5,88 = R$ 23,52). Revalidar antes de cada campanha.
- Validar Política de Privacidade e Termos com a pessoa responsável pelo negócio.
- Configurar Pixel/GA4 e a integração de conversões confirmadas, se forem usados.
- Definir o domínio final e testar o checkout, os parâmetros de campanha e os links legais na publicação.

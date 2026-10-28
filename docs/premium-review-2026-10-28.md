# Revisão integral — 28/10/2026

## Auditoria da versão publicada

Base: main 221d2c4. O domínio de produção servia esse commit no início da tarefa, com CSS e app correspondentes; o problema não era um deploy antigo.

- Um Hero, um h 1, um fechamento e um rodapé no DOM. A repetição visual vinha de mockups, mensagens e blocos de compra que reapareciam em várias estruturas, incluindo a barra móvel.
- Quatro folhas de estilo competiam: styles.css, brand-horizontal-v1.css, landing-light-theme-v10.css e premium-architecture-v1.css. A última limitava o h 1 a 28 px no mobile e 38 px no desktop. O tema claro alterava a direção cromática principal.
- As folhas/scripts adicionais sob /assets tinham URLs fixas com cache immutable anual. Visitas de retorno poderiam misturar arquivos antigos com o app/CSS principal versionados.
- ui.js, reviews-carousel e premium-interactions coexistiam como três proprietários de apresentação.
- O modal antigo só abria por intenção de saída após 30 s e 25%scroll, ou por acionamento manual, com bloqueio de 24 h. Não havia agendamento de 6 s/4 s.
- O cronômetro tinha endsAt:null; a nota tinha publish:false e os avatares/prints estavam vazios. A ausência visual tinha origem nos dados, não em uma avaliação ou foto pronta para divulgação.
- O explorador tinha apenas 3 jornadas com amostras.

## Evidências e decisões editoriais

Foram inspecionadas as referências Pet STL Pro anexadas: hero concentrado, mockup em destaque, etiquetas, cartões de etapas e oferta com preço/CTA visualmente dominantes. A nova implementação aplica essa composição à identidade própria da marca; nenhum ativo, texto ou logo da referência foi copiado.

O arquivo fornecido 500_Mantras_Edicao_Premium.pdf tem 127 páginas e 500 mantras sequenciais, em 10 jornadas. O índice e 30 amostras estão em data/product-content.json, com números e páginas. Sete páginas selecionadas foram renderizadas integralmente; o PDF pago completo não integra public/dist. Os cinco prints de WhatsApp fornecidos foram otimizados, sem reconstruir conversas ou modificar textos.

O responsável confirmou expressamente nesta conversa a garantia de 7 dias. O checkout também a apresenta na arte. A campanha não tem prazo real informado: o relógio está implementado e testado, mas a publicação usa uma faixa neutra. Não se utiliza o contador do checkout como data de encerramento da landing page.

Preço conferido em 28/10: produtoR$ 9,90, taxaR$ 0,99 e totalPIX R$ 10,89. Os três complementos são opcionais e cobrados à parte. Parcelas antigas de um preço anterior foram removidas da configuração; não são anunciadas condições de parcelamento não escolhidas.

Compatibilidade das bandeiras Visa/Mastercard/Elo confirmada nas fontes oficiais Cakto: https://www.cakto.com.br/metodos-de-pagamento/cartao-de-credito e https://www.cakto.com.br/cobertura/brasil . Os logos existentes foram preservados. A disponibilidade e o total final continuam sob responsabilidade do checkout.

Não foram fornecidas fotos independentes para o grupo de avatares nem uma nota agregada comprovada. SocialProofRating está integrado e preparado, mas permanece oculto com dados vazios. Os relatos fornecidos aparecem no carrossel WhatsApp, sem selo de compra verificada, estrelas atribuídas ou contagens de compradores inventadas.

## Arquitetura final

- index.html: uma sequência de compra, com um Hero e um encerramento; componentes dinâmicos resolvidos no build.
- styles.css: única folha da interface, fontes locais Lora 600 e Source Sans 3, corpo 16 px ou maior, CTAs verdes.
- app.js: preservado como único proprietário de consentimento, atribuição e analytics.
- interactions.js: único proprietário do cronômetro, scheduler da oferta, lightbox, carrosséis, faixa e explorador.
- scripts/render-content.mjs: renderização estática dos dados editoriais para build e dev, incluindo conteúdo utilizável sem JavaScript.
- data/product-content.json: amostras, jornadas e imagens reais. Dados comerciais e regras de frequência ficam em site.config.json.
- CSS, app e interações recebem nomes com hash de conteúdo. Os scripts/CSS antigos foram removidos, incluindo ui.js e a barra móvel de compra antiga.

O pop-up usa 6000 ms na primeira abertura,4000 ms após fechar, limite de 3 exibições por sessão, sem conflito com outro diálogo, pausa em segundo plano, descarte de timers em pagehide e bloqueio durante navegação ao checkout. A frequência e o limite podem ser ajustados em site.config.json.

## Validação e entrega

Executar build, smoke e scripts/premium-test.mjs. A suíte testa 320/375/390/430/768/1024/1440 px em Chromium/WebKit, galerias, swipe, lightbox, explorador, campanha absoluta/expiração, scheduler 6/4 s, limite/conflitos/foco/segundo plano, CTAs, consentimento e eventos simulados. Não há lint configurado; a sintaxe é verificada com node --check.

Build, smoke e verificação de sintaxe aprovados. Chromium e WebKit passaram nas sete larguras, sem overflow ou erros de console. Os testes funcionais confirmaram abertura em 6 s, recorrência em 4 s, limite de três exibições, pausa/conflitos/foco/checkout, relógio absoluto e expiração, galeria, carrosséis, dez jornadas, consentimento e Pixel. Os três blocos de revelação foram conferidos com movimento normal. A revisão final de layout trouxe o CTA inteiro para a primeira dobra: aproximadamente 542 px no mobile 390×844 e 878 px no desktop 1440×900. Capturas e relatórios foram inspecionados; não se inferiu qualidade a partir da compilação.

Entrega em branch codex/premium-reference-rebuild com Pull Request para revisão. Não realizar merge nem deploy de produção sem autorização do usuário.

## Correção final da apresentação

A revisão encontrou R$ 19,90 gravado no vídeo antigo. Foi criada uma apresentação visual nova de 18,5 segundos, com quatro páginas reais da edição premium e sem preço ou narração. Arquivo H.264/720p/faststart de 531.261 bytes, com decodificação completa aprovada. Os dois vídeos anteriores permanecem no Git, fora do build. Reprodução inline, término/CTA final, ausência de erros e Range 206 passaram em Chromium e WebKit. Capturas comparativas estão em docs/review-2026-10-28/.

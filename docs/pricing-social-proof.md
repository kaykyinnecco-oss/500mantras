# Oferta, garantia e avaliações

Base: main 97e7fba. Implementação sobre a landing page existente, sem dependências novas.

- Preço anterior de R$ 29,90 confirmado pelo proprietário como efetivamente praticado. Exibido riscado no hero e na oferta, com R$ 19,90 em destaque e pagamento único, sem mensalidades. Nenhum prazo artificial foi criado.
- Oito avaliações reproduzidas integralmente, com autorização expressa no pedido. A origem e os textos estão em `reader-reviews.json`. São seis notas 5 e duas notas 4: 38 / 8 = 4,75, arredondado para 4,8. As estrelas da média recebem 95% de preenchimento. Sem fotografias, selo de compra verificada ou extrapolação para outras avaliações.
- Seção após as páginas reais e antes da oferta. Grade em desktop e carrossel nativo em mobile, com controles, posição, teclado e respeito ao movimento reduzido. Texto completo disponível mesmo sem JavaScript.
- Medalhão SVG próprio na seção de garantia; versão compacta junto ao preço e versão simplificada na faixa de confiança. Não representa certificação de terceiros. Política e canal de reembolso preservados.
- CTAs dourados, raio de 10px, sombra discreta e feedback de pressão. Oito tags de compra, destinos, parâmetros e mecanismos comerciais originais preservados.
- Copy adicional limitada ao uso cotidiano e à descoberta dos temas reais, sem promessas de eficácia. Contato e a única observação sobre versão física continuam no rodapé.

## Bandeiras

Visa, Mastercard e Elo confirmadas expressamente pelo proprietário na resposta à pergunta desta tarefa. A tentativa de abrir o checkout foi bloqueada pela permissão do navegador; não houve inspeção independente das bandeiras nem compra de teste. Marcas locais, proporções preservadas, obtidas dos recursos públicos dos sites oficiais:

- Visa: https://corporate.visa.com/en/about-visa/brand.html — imagem https://media.ffycdn.net/us/visa/6cLYMDbRxZyYP2zMQ4sW.png?width=200
- Mastercard: https://www.mastercard.com/brandcenter/us/en/download-artwork.html — símbolo exibido pelo site https://www.mastercard.com/content/dam/brandcenter/assets/images/logos/mclogo-for-footer.svg
- Elo: https://www.elo.com.br — marca branca exibida pelo site https://media.elo.com.br/strapi-hml/white_logo_90137be05c.svg

Nenhum recurso de marca é carregado remotamente pelos visitantes.

## Verificação executada

- `npm run build` e `npm test`: aprovados. A suíte verifica os hashes dos scripts e configurações protegidos, oito tags originais de CTA, vídeo, consentimento, páginas legais, assets, preços, oito depoimentos exatos e cálculo da nota.
- `node --check` nos três arquivos JavaScript adicionados/ajustados: aprovado. SVGs novos analisados como XML; `git diff --check` aprovado.
- Navegador controlado: 320, 360, 375, 390, 414, 768 e 1440px. Sem overflow horizontal da página, cortes de textos comerciais ou dos depoimentos; CTAs visíveis com altura mínima de 56px. Bandeiras cabem na faixa nas sete larguras; controles do carrossel ocultos na grade desktop.
- Carrossel mobile: próximo/anterior, Home/End, indicador de posição, limite no oitavo card e rolagem horizontal nativa verificados. Toque físico em aparelhos reais permanece como teste complementar.
- Vídeo reproduzido até 39,83 segundos, encerramento e CTA final presentes, sem erro de mídia. Privacidade e Termos abertos pelos links do rodapé.
- Preferências: abrir, fechar sem escolha, aceitar, reabrir, aceitar novamente e recusar após aceite. Sem scripts opcionais na recusa; um único carregador oficial `fbevents.js` após aceite; remoção após revogação. Console sem erros/avisos durante essa verificação.
- Contraste calculado: CTA 10,13:1; textos de avaliações 15,87:1; estrelas individuais 4,70:1. Tipografia, logo, mockups, imagens reais e vídeo preservados.

`scripts/browser-test.mjs` é o runner opcional existente, atualizado e verificado sintaticamente. Não foi executado nesta entrega: a verificação visual/interativa acima foi feita pelo navegador controlado, e não deve ser confundida com a suíte `npm test`.

## Proteções e limites

`app.js`, `ui.js`, `site.config.json`, `vercel.json`, rotas e textos legais, scripts de build, vídeo e parâmetros de checkout permanecem iguais à base protegida. Pixel 2429955871112248 e eventos PageView, InitiateCheckout, OfferViewed e de vídeo não foram alterados ou duplicados. Nenhum Purchase foi adicionado. Google Analytics e consentimento permanecem como configurados anteriormente.

Destinos dos oito CTAs conferidos sem efetuar transação. O carregamento real do Pixel foi observado no navegador, mas a contagem e o recebimento dos eventos no Gerenciador de Eventos da Meta não foram auditados nesta entrega. Não se afirma ganho de conversão, aprovação de Core Web Vitals ou validação em aparelhos físicos. Publicação e commit são registrados no PR e no relatório final após a confirmação da Vercel.

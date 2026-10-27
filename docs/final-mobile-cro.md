# Otimização final de fluxo e experiência mobile

Base: main 4225a9f. Projeto estático existente, HTML/CSS/JavaScript nativo, com build Node e sem dependências novas de produção.

## Fluxo e apresentação

Ordem: hero → momentos de uso → vídeo → o que vem no e-book → páginas reais e mantras → depoimentos → dez temas → oferta → garantia → FAQ → CTA final → rodapé. O vídeo foi movido integralmente para depois dos momentos de uso: o visitante conhece a proposta antes da apresentação de 40 segundos e pode aprofundar a leitura nas amostras seguintes. Arquivo, controles, preload, poster, IDs e mecanismos de rastreamento preservados. O botão de reprodução ficou mais evidente.

Os oito CTAs existentes mantêm suas tags, atributos, destinos e texto principal. O novo acabamento usa gradiente dourado suave, borda, sombra/glow estático, chevron decorativo, foco contrastante e pressão discreta. O chevron é omitido no cabeçalho abaixo de 360px para priorizar a legibilidade. O movimento é desativado com prefers-reduced-motion. Ao concluir o vídeo, CSS apresenta apenas o CTA de conclusão; o CTA normal permanece no DOM e reaparece quando o bloco de conclusão fica oculto, preservando os dois locais de evento.

Hero e transições enfatizam uma leitura breve, escolha por tema e possibilidade de revisitar as mensagens, sem rotina rígida ou promessa terapêutica. Incluída uma linha de confiança após o CTA do conteúdo. Na oferta, as condições e o selo existentes cumprem esse papel sem repetir a nova linha. Contorno da oferta refinado, checks discretos, legendas maiores e espaçamento vertical reduzido de 48/64px para 40/56px nas seções principais.

Os oito relatos autorizados permanecem integrais e com as notas originais. A frase de contagem solicitada foi retirada. Média exata 38/8 = 4,75, exibida como 4,8; as estrelas continuam proporcionais. Cabeçalhos dos cards alinhados e resumo mais compacto.

## Logos e bandeiras

Termos e Privacidade reutilizam exatamente o asset da home, logo-500-mantras-celestial-v2.webp (480 × 320). Alteração limitada às tags dessas imagens; textos legais e consentimento permanecem íntegros, verificados pelo hash anterior após normalizar somente a atualização da logo.

VISA: o PNG original de 134 × 134 tinha margens transparentes acima e abaixo da marca. A área com alpha foi preservada integralmente (x 0–133, y 45–88), exportada sem perdas como payment-visa-aligned-v1.webp (134 × 44, 836 bytes). Comparação de todos os pixels visíveis confirmou identidade exata. O PNG antigo foi removido do build. As três bandeiras são centralizadas em caixas internas de 20px, com object-fit contain; nenhum logotipo é deformado. Visa, Mastercard e Elo são as mesmas bandeiras confirmadas anteriormente pelo responsável.

O selo premium aprovado, suas três aplicações, o preço de R$ 29,90 por R$ 19,90 e o texto integral da garantia permanecem intactos.

## Verificação

- npm run build, npm test, sintaxe dos testes JS e git diff --check aprovados.
- Navegador controlado: 320, 360, 375, 390, 414, 430, 600, 768, 1024 e 1440px. Sem overflow horizontal, cortes de parágrafos/títulos ou depoimentos; CTAs visíveis com altura mínima de 56px. CTA do hero visível na primeira tela de 320 × 844.
- Vídeo único reproduzido até 39,83s; CTA de conclusão visível e convite normal oculto nessa etapa, sem erro de mídia.
- Carrossel de avaliações: avanço, Home/End, primeira/oitava posição e limite de navegação conferidos.
- Logos institucionais carregadas em mobile/tablet/desktop, com proporção preservada e links de retorno dentro da tela. Privacidade e Termos acessíveis; preferências abrem e fecham.
- VISA centralizada nos dois eixos, medida no navegador; as três bandeiras carregadas e sem corte.
- Consentimento em mobile/desktop: sem scripts opcionais na recusa, um carregador oficial fbevents.js após aceitar, ainda um após repetir o aceite e nenhum após revogação. Painel cabe no celular e a barra de compra fica oculta enquanto está aberto.
- Oito destinos conferidos e parâmetros utm_source/utm_campaign preservados nos links, sem abrir o checkout ou realizar transação.
- Contraste do texto dos CTAs: mínimo calculado de 8,40:1 nos tons do gradiente. Console observado sem erros/avisos. Assets de produção conferidos pela suíte e pelas imagens inspecionadas.

app.js, ui.js, o script de avaliações, configurações, vídeo, selo, rotas e scripts de publicação não mudaram. Pixel 2429955871112248, PageView, InitiateCheckout, OfferViewed e eventos de vídeo conservam as guardas originais. Nenhum Purchase adicionado. O ID GA4 está vazio na configuração versionada; essa configuração não foi alterada.

O runner opcional browser-test.mjs foi atualizado para incluir 430px e verificado sintaticamente; não foi executado. Os testes de interação acima usaram o navegador controlado. Não houve auditoria do recebimento/contagem no Gerenciador da Meta, teste em aparelho físico ou medição de aumento de conversão/Core Web Vitals. Commit, PR e deploy são registrados na entrega após a verificação do domínio público.

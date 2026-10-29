# Ajustes de conversão — 28/10/2026

Base: `cdff054`. Branch: `ajustes-conversao-500-mantras`.

## Escopo por item

1. Hero: headline e subheadline solicitadas, apoio preservado, microcopy e acesso após aprovação. Mesmas fontes, tamanhos, grid e mockups.
2. Benefícios: dor da rotina/noites aceleradas, pausa de dois minutos como sugestão de uso, quatro benefícios no componente existente e microcopy nos sete CTAs. Os títulos originais das jornadas e os mantras permanecem intactos. Não foram adicionados subtítulos às opções do seletor para evitar prejudicar sua leitura mobile.
3. WhatsApp: cinco prints originais, carrossel e zoom preservados. Subtítulo e alternativas neutras; nenhuma avaliação ou conversa inventada.
4. Preço de referência R$ 49,90 informado pelo proprietário; venda R$ 9,90. Valores riscados com `s`, versão única para leitor de tela, JSON-LD/OG com preço de venda sem validade fictícia. Garantia e linha de valor reforçadas. A informação de eventuais taxas/total foi preservada: a configuração comercial vigente registra taxa de R$ 0,99 e total PIX de R$ 10,89, portanto não se promete um total de apenas R$ 9,90.
5. Sem prazo real de campanha, confirmado pelo proprietário, não foi ativado um relógio por visitante com mensagem de término que não afeta a oferta. Mantida faixa neutra com novo formato de preço. O contador absoluto existente permanece pronto para um prazo real.
6. Pop-up: mesmo CTA, link e atribuição. Opção de continuar fecha sem checkout, preserva posição, suspende reaparição na sessão via sessionStorage com fallback em memória. CTA recebe foco ao abrir; Tab nos limites permite sair, Escape e X preservados. Gatilhos de seis/quatro segundos intactos.
7. Capa atual já corresponde ao PDF fornecido em todos os mockups e OG. Nenhum arquivo novo foi indicado: o caminho do pedido é um placeholder. As duas logos existentes diferem da tipografia da capa. Mantida a logo atual para não improvisar; aguarda arquivo oficial separado.
8. Fundo `#EFEDF2` no corpo e seções claras indicadas, inclusive entorno da oferta. Card da oferta mantém paleta original. Contrastes de navegação, corpo, textos auxiliares e garantia ajustados; glow sutil do produto preservado.
9. Usos de sparkles trocados pelo livro de linha existente na faixa, explorador e jornadas. Anéis decorativos do hero removidos, gradiente ambiental amplo removido. Capa/páginas e identidade oficial sem alterações. Nenhum emoji adicionado.
10. Seção de complementos removida; FAQ informa opcionais cobrados à parte no checkout.
11. E-mail preservado e confiança da Cakto/acesso após aprovação no encerramento.
12. `app.js`, IDs, seletores e handlers analíticos/consentimento intactos. Sem GA/GTM configurado, nenhum Consent Mode novo foi instalado. Comentários em HTML indicam integração futura do ID/rótulo Google Ads sem valores fictícios ou evento de compra.
13. Build, smoke e suíte Chromium aprovados. Sem dependências novas. Vídeo continua `preload="none"`, sem autoplay; dimensões/lazy loading existentes preservados. Revisão renderizada em 375/768/1280 e regressão de 320 a 1440 px, sem overflow ou erros de console.

## Rastreamento: comparação de chamadas antes/depois

| Condição | Antes | Depois |
|---|---|---|
| Sem escolha / rejeição | Sem SDK/eventos | Igual |
| Aceite válido | PageView, uma vez | Igual |
| Oferta com 15% visíveis, após consentimento | OfferViewed, uma vez | Igual |
| Clique em CTA | InitiateCheckout, uma vez por clique | Igual |
| Reprodução do vídeo | VideoStart, VideoProgress 25/50/75, VideoComplete | Igual |
| Continuar no pop-up | Não existia escolha persistente | Nenhum evento de checkout/compra |
| GA/GTM | Não configurado | Não configurado |
| Purchase / ViewContent | Não existentes | Não adicionados |

Inventário, hash anterior de `app.js`, registros de rede e JSON de comparação estão em `node_modules/.cache/conversion/`, fora do commit conforme solicitado. A comparação determinística intercepta apenas o SDK de métricas no navegador de QA, para contar chamadas sem contaminar métricas reais. Também foi observado o carregamento real HTTP 200 do SDK/configuração Meta em produção; isso não comprova recepção dos eventos no Gerenciador de Eventos. A validação dessa recepção exige acesso à conta Meta.

As capturas antes/depois ficam no mesmo diretório temporário. A suíte de regressão verifica consentimento aceito/rejeitado/expirado/revogado, UTMs, eventos únicos, galeria, carrosséis, foco, pop-up, vídeo e responsividade. O teste de rolagem usa deslocamento instantâneo para realmente visitar todas as seções, inclusive com animações habilitadas. Emulação WebKit/Chromium não substitui teste em iPhone físico.

## Pendências de material/configuração

- Logo oficial separada coerente com a capa.
- ID Google Ads/GA e rótulo de conversão, definição do evento real de compra e validação do consentimento antes de instalação.
- Prazo comercial real, caso se queira exibir contagem de encerramento.
- Confirmação no Gerenciador de Eventos da recepção final pelo Meta.

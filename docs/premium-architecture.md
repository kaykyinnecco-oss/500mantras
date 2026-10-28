# Arquitetura premium — revisão manual

Esta branch reorganiza a landing page existente. Não altera `app.js`, `ui.js`, configuração comercial, variáveis, rotas legais ou configuração de publicação. Os novos CTAs usam o mesmo `data-checkout` e o listener delegado de consentimento/rastreamento existente. Não há evento de compra novo.

## Conteúdo configurável

Arquivo: `public/assets/premium-content-v1.js`.

- `promotion.endsAt`: `null` por padrão. Somente cadastrar uma data absoluta ISO com fuso para uma campanha real. O contador usa essa mesma data para todas as visitas, desaparece ao expirar e não reinicia.
- `rating.target`: alvo visual 4,8. `publish:false` mantém a mensagem neutra na versão pública. Para publicar, registrar evidência em `source`, validar a nota e habilitar `publish`. `count` é independente e deve corresponder à amostra comprovada; `null` não exibe quantidade. Não há selo de compra verificada.
- `rating.avatars`: lista vazia. Cada foto futura aceita `{src:"/assets/foto.webp", alt:"Descrição autorizada", authorized:true}`. Cadastrar somente imagens reais com autorização documentada. Não há fotos artificiais ou espaços vazios visíveis em produção.
- `whatsapp`: lista vazia oculta toda a seção. Um item aceita `{src, alt, name, date, order, width, height, authorized:true, privacyReviewed:true}`. Nome e data são opcionais. Usar dimensões reais para reservar o espaço durante o carregamento. O carrossel aceita toque nativo, teclado, botões, indicadores e ampliação em diálogo.
- `journeys`: três mantras reais das páginas 07, 19 e 43. As dez jornadas da faixa foram recuperadas do conteúdo anterior do próprio repositório. Não há PDF completo no repositório para conferir os outros sete exemplos. Acrescentar mensagens somente após conferir texto, tema, número e página no produto real.

Antes de cadastrar prints: obter autorização de divulgação, ocultar no próprio arquivo telefones, fotos, nomes e demais dados pessoais sem autorização; revisar o resultado e somente então marcar `privacyReviewed:true`. **Não enviar os originais privados ao GitHub**. A flag é uma confirmação editorial, não uma ferramenta automática de anonimização.

`?previewContent=1` mostra o alvo de avaliação e uma legenda de espaço para fotos somente em `localhost` ou `127.0.0.1`. Essa opção não habilita métricas sem comprovação em domínios públicos, inclusive previews da Vercel. As estrelas SVG usam preenchimento proporcional à nota.

Os oito relatos textuais fornecidos anteriormente pelo proprietário permanecem intactos e independentes dos futuros prints. A configuração não transforma esses relatos em compras verificadas.

## Modal de saída

- Desktop com ponteiro fino/hover: possível abertura ao sair pelo topo após pelo menos 30 segundos e 25% de rolagem.
- Mobile: abertura somente pela ação explícita “Compare a prévia com o e-book completo”; não há interceptação do botão voltar ou abandono da página.
- Uma apresentação por sessão. Fechar aplica intervalo de 24 horas entre sessões; falha de armazenamento mantém proteção em memória.
- Clique ou início de toque em qualquer CTA de checkout bloqueia novas aberturas nesse documento. Não abre sobre outro diálogo ou com a página oculta.
- X, Escape, botão secundário e link fecham o diálogo nativo. Foco permanece no diálogo durante a abertura e retorna a um controle visível ao fechar.
- O preço é o mesmo R$ 9,90. Não há desconto adicional ou urgência inventada.

## Validação

`npm run build` e `npm test` verificam preço, dez destinos de checkout, contratos dos arquivos de integração, consentimento, páginas legais, oito relatos originais, três amostras, sete FAQs, ausência de métricas/prints públicos pendentes e regras de autorização/privacidade. Não há script de lint configurado.

A revisão local em navegador cobre 320, 375, 390, 430, 768, 1024 e 1440 px; galeria e ampliação, explorador, abertura explícita do modal e frequência, FAQ, reprodução/pausa do vídeo, consentimento e destinos dos CTAs. Um fixture técnico descartável em `dist` usa as páginas reais como imagens explicitamente identificadas de teste para exercitar o carrossel futuro; ele não integra a branch nem o build final.

As três rotas locais `/`, `/privacidade` e `/termos` responderam HTTP 200. A inspeção dos dez destinos mostrou o checkout oficial preservado. A tentativa de navegar ao checkout foi bloqueada por uma permissão salva do navegador para o domínio da Cakto; não houve compra e a tela externa não foi inspecionada. Os pares principais de contraste foram calculados: dourado sobre branco 4,96:1, champagne sobre roxo 12,01:1, branco sobre verde 4,80:1 e verde sobre cápsula clara 6,05:1. Isso não substitui uma auditoria completa de acessibilidade.

Não foi medida melhoria de conversão nem emitido laudo de Core Web Vitals. A entrega ao Gerenciador de Eventos da Meta e a experiência em Android/iPhone físicos exigem validação nesses ambientes. Preservação de código e testes locais não comprovam recebimento de eventos pelo serviço externo.

## Pendências e publicação

Pendentes: fotos autorizadas, prints reais já anonimizados, evidência para publicar nota/quantidade, conteúdo conferido das outras sete jornadas e eventual prazo promocional verdadeiro. Sem esses dados, os respectivos elementos permanecem neutros, ocultos ou limitados às amostras documentadas.

Entrega por Pull Request para `main`. Não realizar merge ou deploy de produção nesta tarefa. Uma prévia automática eventualmente criada pela integração existente deve ser tratada apenas como ambiente de revisão.

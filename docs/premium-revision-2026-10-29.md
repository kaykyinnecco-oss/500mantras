# Revisão visual e funcional — 29/10/2026

## Auditoria e sincronização

A auditoria inicial encontrou a produção baseada em `221d2c4`, com quatro camadas de CSS, pop-up dependente de saída após 30 segundos/cooldown de 24 horas e prova social sem fotos/prints cadastrados. Existia um Hero e um rodapé no DOM: não foi constatada duplicação literal. Oferta no modal, barra móvel e CTAs repetidos reforçavam a impressão de duplicidade.

Durante o trabalho, a main recebeu os PRs #27–#29. A branch foi sincronizada com `66f61f4` antes da entrega. Essa base já corrigia parte dos problemas e trazia logo oficial v3, vídeo da edição premium, prints, catálogo real e ajustes comerciais. Foram incorporados sem reverter as aprovações recentes. As capturas comparativas atuais mostram a produção já com a logo v3; as capturas da base antiga não são apresentadas como o estado atual.

## Implementação desta revisão

- Hero editorial, título encorpado, capa e páginas reais em composição de livro/tablet/celular. No mobile, preço e CTA aparecem antes do mockup.
- Uma folha carregada pela landing e um controlador ativo de apresentação; arquivos legados não são montados sobre os componentes novos.
- Etiquetas animadas, quatro etapas numeradas, faixa contínua com os dez títulos originais e controle de pausa.
- `SocialProofRating`: quatro fotos reais sobrepostas, cápsulas e texto neutro. Nota/contagem ocultas sem comprovação.
- `WhatsAppTestimonials`: cinco prints existentes, setas, teclado, carrossel e ampliação completa. Nenhuma conversa/pessoa/nota criada.
- Galeria com seis páginas reais e lightbox com navegação/zoom. Três prévias adicionais foram renderizadas do PDF; as outras reutilizam assets da main.
- Explorador com um exemplo de cada jornada, oferta com capa real grande, R$ 9,90, CTA verde, selo original, bandeiras e complementos explicitamente opcionais.
- Garantia, FAQ e um único fechamento/rodapé. Logo, favicon, SEO, vídeo de 19 segundos e poster da main atual preservados.
- Agendador isolado, 6/4 segundos, teto de três exibições; continuar encerra a recorrência na sessão, X/Escape permitem a repetição configurada.

O preço de referência R$ 49,90 já estava registrado na main e em `docs/ajustes-conversao-2026-10-28.md` como informado pelo proprietário. Foi preservado sem novos percentuais/prazos. Preço do produto, taxas e total PIX da configuração não foram modificados. A apresentação orienta conferir as condições no checkout.

## Testes e evidências

- Instalação: `npm install --ignore-scripts --package-lock=false`, sem dependências novas. `npm ci` não se aplica: não há lockfile.
- Build e `npm test` aprovados. Hashes exatos protegem app, configuração, pipeline e páginas legais de `66f61f4`; testes verificam checkout, conteúdo/assets, IDs/ARIA e ausência de tracking direto no HTML.
- Relógio controlado: abertura 6000 ms, repetição 4000 ms, um timer, limite por sessão, pausa/retomada, conflitos, cancelamento no checkout e limpeza.
- Navegador: primeira abertura em 6346,6 ms; segundo disparo em 50457,2 ms após fechamento em 46444,4 ms: intervalo 4012,8 ms. Sem dois modais de oferta simultâneos. X, Escape, retorno de foco e escolha de continuar testados; a escolha persistiu no reload.
- Cronômetro: fixture local identificada, com prazo absoluto de teste, atualizou segundos, não reiniciou no reload e desapareceu ao expirar. A fixture é temporária, fora do Git/build final. Publicação permanece com `endsAt: null`.
- Larguras 320, 375, 390, 430, 768, 1024 e 1440 px: sem overflow horizontal. Corpo 17 px mobile/18 px desktop; um Hero/fechamento/rodapé, cinco prints e seis prévias.
- Galeria, setas/Home/End, ampliação, zoom, explorador com dez opções, pausa da faixa, FAQ e preferências exercitados no navegador. Preferências abertas impediram sobreposição da oferta.
- `/privacidade` e `/termos` abriram sem 404. Destinos dos CTAs conferidos sem realizar compra.
- Contrastes calculados: branco/verde do CTA 4,80:1; dourado/título sobre off-white 4,97:1; texto secundário 5,82:1; champagne/roxo 11,69:1.
- Vídeo atual preservado, sem autoplay, com controles; reprodução/pausa verificadas.

Não há lint configurado; a sintaxe foi verificada. O runner antigo de navegador, com seletores incompatíveis, foi substituído pelos contratos atuais, testes determinísticos e conferência real no navegador integrado. Não se alega teste em aparelho físico ou recepção pelo Gerenciador de Eventos da Meta. O checkout externo não foi percorrido: bloqueio de navegação anterior impede sua inspeção neste navegador; URLs foram conferidas no HTML/DOM sem compras. Core Web Vitals e conversão não foram medidos.

## Capturas reais

Antes/depois do Hero usam a mesma largura. Capturas por seção complementam a conferência; a ferramenta não conseguiu capturar a página mobile inteira na rodada final.

- [Antes desktop](screenshots/premium-revision/before-desktop.jpg) / [Depois desktop](screenshots/premium-revision/after-desktop.jpg)
- [Antes mobile](screenshots/premium-revision/before-mobile.jpg) / [Depois mobile](screenshots/premium-revision/after-mobile.jpg)
- [Detalhe da oferta desktop](screenshots/premium-revision/offer-desktop.jpg)
- [Pop-up mobile](screenshots/premium-revision/popup-mobile.jpg)

## Pendências reais

- Prazo promocional verdadeiro, caso se deseje ativar o contador público.
- Fonte verificável para nota agregada/contagem; até lá, mensagem neutra.
- Revisão do proprietário e autorização futura para merge/publicação.
- Validação externa de eventos pela Meta e teste em aparelhos físicos.

Fotos, prints e PDF foram recuperados em `Desktop/Referencias`; não são mais uma pendência. O PDF completo continua fora do repositório público. Esta revisão não realizou merge nem deploy de produção.

A ferramenta de navegador foi interrompida na rodada final. As capturas válidas do Hero foram preservadas, junto de um detalhe parcial da oferta e do pop-up. Não se afirma que exista uma captura integral final da página. A navegação por toque em aparelho físico permanece como validação manual.

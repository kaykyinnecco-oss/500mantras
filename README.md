# 500 Mantras para Elevar Sua Energia

Landing estática em HTML, CSS e JavaScript, sem dependências de produção. Requer Node.js 20+.

```sh
npm install --ignore-scripts --package-lock=false
npm run build
npm test
npm run preview
```

Não há lockfile nem lint configurado. Desenvolvimento: porta 4173; preview: 4174, com override PORT.

## Arquitetura da revisão

- index.html: Hero único, galeria com fallback HTML, oferta, fechamento e rodapé únicos.
- public/assets/landing-premium-v2.css: única folha da landing; Playfair Display 700 e Source Sans 3 locais.
- public/assets/landing-ui-v2.js: SocialProofRating, WhatsAppTestimonials, carrosséis, lightbox, explorador e integração dos temporizadores com o DOM.
- public/assets/popup-scheduler-v2.js: agendador testável e relógio absoluto.
- public/assets/landing-content-v2.js: amostras, assets autorizados e recortes visuais de avatares.
- app.js: único proprietário do checkout, UTMs, consentimento e eventos. Não foi alterado.
- site.config.json: fonte vigente da configuração comercial, campanha e frequência do pop-up.
- data/product-content.json: catálogo original preservado.
- styles.css e interactions.js: preservados para compatibilidade com o pipeline e páginas legais; não são carregados pela landing nova.

Os hashes em docs/protected-main-66f61f4.json garantem a preservação exata de app, configurações, pipeline e páginas legais da main atualizada.

## Campanha e pop-up

campaign.endsAt permanece null: não há prazo promocional real informado. A faixa usa mensagem neutra. Uma campanha real deve usar data ISO absoluta com timezone; o relógio não reinicia ao recarregar e fica neutro quando expira.

O pop-up usa os valores existentes de popup: initialDelayMs 6000, repeatDelayMs 4000, repeatEnabled true, exitIntentEnabled true, maxDisplaysPerSession 3. X e Escape iniciam a recorrência. A escolha explícita de continuar encerra a recorrência naquela sessão, preservando o ajuste recente da main. Aba oculta, outro modal, vídeo e formulário pausam o tempo restante; checkout cancela. Chaves de sessão vigentes preservadas.

## Conteúdo e prova social

Seis páginas reais e dez exemplos foram conferidos no PDF fornecido. O PDF completo pago não entra em public/dist. Os cinco prints reutilizam assets de public/assets/testimonials. Quatro fotos sobrepostas são recortes visuais das fotos nesses prints; nenhuma pessoa foi gerada.

A nota-alvo 4,8 permanece preparada, oculta. Para publicá-la, socialProof exige verified true, rating e source com referência verificável; ratingCount é independente e opcional. Sem fonte, a mensagem continua neutra. Avatares adicionais precisam de src, alt e authorized true. Prints não são convertidos em notas em estrelas.

Os títulos originais das jornadas e a fonte dos trechos estão em docs/product-samples.json. Complementos são opcionais e cobrados separadamente.

## Verificação e publicação

npm test verifica contratos comerciais/legais, conteúdo, assets, unicidade e o agendador/cronômetro com relógio controlado. O runner opcional antigo de Playwright foi removido porque seus seletores pertenciam à arquitetura anterior; a revisão visual foi feita no navegador integrado, conforme docs/premium-revision-2026-10-29.md.

Não foram alegados testes em aparelhos físicos, recepção de eventos pela Meta, aumento de conversão ou pontuação de Core Web Vitals.

Entrega em branch e Pull Request. Não realizar merge nem deploy de produção sem autorização específica do usuário.

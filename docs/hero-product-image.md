# Imagem promocional do hero

Base: main 8a4b9ac. Arte oficial fornecida pelo proprietário no arquivo “Mockup Luxuoso de Mantras e Autocuidado.png”, 1536 × 1024, 2.341.242 bytes. SHA-256 da fonte: 90d1d561b407d951097f29f80062f6cd3fee7ec117c4e7edff027b4916572a45.

Conversão proporcional para WebP, qualidade 90, com Sharp como ferramenta externa ao projeto: hero-mantras-premium-v1-720.webp (720 × 480, 97.942 bytes) e hero-mantras-premium-v1-1200.webp (1200 × 800, 208.786 bytes). Composição integral preservada; nenhuma sobreposição de texto/ícones ou animação adicionada.

O hero usa srcset/sizes com as duas resoluções. Preload usa os mesmos candidatos e tamanhos; fetchpriority high, loading eager e dimensões intrínsecas explícitas priorizam a primeira dobra e reservam seu espaço. Imagem com proporção 3:2, object-fit contain, cantos de 16px, contorno dourado e sombra discreta. Espaçamento inicial mobile reduzido em 8px e gaps em 4px para acomodar a arte mais larga e manter o CTA evidente. Desktop conserva texto/oferta à esquerda e imagem à direita.

Escopo desta etapa: imagem e preload do hero, estilos do hero e ajuste dos testes existentes. Demais imagens, metadados de compartilhamento, vídeo, preço, CTAs, garantia, depoimentos, páginas legais, scripts e configurações permanecem iguais à base. A atualização de capa do vídeo solicitada posteriormente é tratada em commit próprio.

Verificação: build e npm test aprovados; sintaxe do teste JS e diff conferidos. Inspeção no navegador em 320, 375, 390, 430, 600, 768 e 1440px: imagem carregada, proporção 1,5, composição inteira, sem overflow e oito destinos de checkout preservados. Os quatro tamanhos mobile solicitados mantêm o CTA principal dentro da janela de teste de 844px de altura. Não se afirma medição de Core Web Vitals ou teste em aparelho físico.

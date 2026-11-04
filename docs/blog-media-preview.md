# Mídias ajustáveis e prévia completa do Blog

## Resumo

31 arquivos envolvidos nesta entrega: 8 criados, 21 alterados e 2 removidos. As quantidades se referem a esta tarefa, preservando alterações anteriores dos três projetos. Nenhuma dependência ou migração de banco foi adicionada.

Imagens e vídeos no conteúdo podem ter largura de 20% a 100% da área de texto, alinhamento à esquerda/centro/direita e posição vertical alterada por arraste ou setas. A ordem e os ajustes são validados pela API e preservados na gravação e no snapshot público.

A aba Prévia usa o layout completo do Blog institucional, do cabeçalho ao rodapé. O mesmo ArticleView atende a leitura pública e a prévia. A opção Mostrar prévia ao lado acompanha a edição; abaixo de 1200px, os painéis ficam empilhados. Há modos de computador/celular, confirmação de conexão, mensagem de erro e recarga.

## Arquivos

Caminhos relativos ao workspace Afiliados Netbox; cada link aponta ao arquivo local completo. Os removidos não possuem destino clicável verificável. Não foram inventadas URLs de repositório nem linhas de diff: parte do módulo já estava sem rastreamento no Git antes desta tarefa.

| Situação | Caminho e acesso individual | Modificação e finalidade |
| --- | --- | --- |
| alterado | [afiliados_netbox/src/app/integracoes/blog/types.ts](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/src/app/integracoes/blog/types.ts>) | Contrato de largura percentual das mídias. |
| alterado | [afiliados_netbox/src/app/integracoes/blog/richDocument.ts](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/src/app/integracoes/blog/richDocument.ts>) | Serialização segura de tamanho, alinhamento e mídia arrastável. |
| alterado | [afiliados_netbox/src/app/integracoes/blog/components/BlockEditor.tsx](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/src/app/integracoes/blog/components/BlockEditor.tsx>) | Seleção de mídia, arraste entre blocos, ajustes e movimento por teclado. |
| criado | [afiliados_netbox/src/app/integracoes/blog/components/MediaToolbar.tsx](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/src/app/integracoes/blog/components/MediaToolbar.tsx>) | Barra acessível para tamanho, alinhamento, setas e remoção. |
| criado | [afiliados_netbox/src/app/integracoes/blog/components/MediaToolbar.module.css](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/src/app/integracoes/blog/components/MediaToolbar.module.css>) | Aparência dos controles, estados ativos, hover e entrada suave. |
| alterado | [afiliados_netbox/src/app/integracoes/blog/components/ArticleEditor.tsx](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/src/app/integracoes/blog/components/ArticleEditor.tsx>) | Prévia completa ao lado da edição, com adaptação ao celular. |
| alterado | [afiliados_netbox/src/app/integracoes/blog/components/ArticlePreview.tsx](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/src/app/integracoes/blog/components/ArticlePreview.tsx>) | Iframe com mensagens de atualização, confirmação, recarga e modos computador/celular. |
| criado | [afiliados_netbox/src/app/integracoes/blog/components/ArticlePreview.module.css](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/src/app/integracoes/blog/components/ArticlePreview.module.css>) | Moldura responsiva, indicador de conexão e transições. |
| removido | `afiliados_netbox/src/app/integracoes/blog/components/RichContent.tsx` (arquivo removido; sem destino local) | Renderer local substituído pela página real do institucional. |
| alterado | [afiliados_netbox/src/app/integracoes/blog/blog.module.css](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/src/app/integracoes/blog/blog.module.css>) | Seleção e destino do arraste, dica e composição lado a lado. |
| alterado | [afiliados_netbox/tests/blogRichDocument.test.mjs](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/tests/blogRichDocument.test.mjs>) | Teste de serialização, ordem e rejeição de CSS injetado. |
| alterado | [afiliados_netbox/src/app/integracoes/blog/README.md](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/src/app/integracoes/blog/README.md>) | Uso dos controles, fluxo da prévia e limitações do histórico nativo. |
| alterado | [afiliados_netbox/README.md](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/README.md>) | Entrada para a funcionalidade e este relatório. |
| alterado | [afiliados_netbox/.env.example](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/.env.example>) | Explica o uso da origem institucional também para a prévia. |
| criado | [afiliados_netbox/docs/blog-media-preview.md](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados_netbox/docs/blog-media-preview.md>) | Relatório, arquivos, arquitetura, configuração e validação desta entrega. |
| alterado | [Site institucional - Netbox/lib/blog/richDocument.ts](</D:/programas/Projetos de programação/Afiliados Netbox/Site institucional - Netbox/lib/blog/richDocument.ts>) | Contrato público equivalente para o tamanho da mídia. |
| criado | [Site institucional - Netbox/lib/blog/preview.ts](</D:/programas/Projetos de programação/Afiliados Netbox/Site institucional - Netbox/lib/blog/preview.ts>) | Normalização dos dados recebidos, URLs, datas e conteúdo tipado. |
| criado | [Site institucional - Netbox/components/blog/articles/ArticleView.tsx](</D:/programas/Projetos de programação/Afiliados Netbox/Site institucional - Netbox/components/blog/articles/ArticleView.tsx>) | Apresentação compartilhada entre leitura pública e prévia, preservando fontes e relacionados. |
| alterado | [Site institucional - Netbox/components/blog/articles/ArticlePage.tsx](</D:/programas/Projetos de programação/Afiliados Netbox/Site institucional - Netbox/components/blog/articles/ArticlePage.tsx>) | Mantém busca, metadata e JSON-LD; delega a apresentação ao ArticleView. |
| criado | [Site institucional - Netbox/components/blog/articles/LiveArticlePreview.tsx](</D:/programas/Projetos de programação/Afiliados Netbox/Site institucional - Netbox/components/blog/articles/LiveArticlePreview.tsx>) | Recebe rascunhos por postMessage somente da janela e origens autorizadas. |
| criado | [Site institucional - Netbox/app/(blog)/site/blog/preview/editor/page.tsx](</D:/programas/Projetos de programação/Afiliados Netbox/Site institucional - Netbox/app/(blog)/site/blog/preview/editor/page.tsx>) | Rota noindex sob o layout real do Blog, sem conflito com artigos de um segmento. |
| alterado | [Site institucional - Netbox/components/blog/articles/RichContent.tsx](</D:/programas/Projetos de programação/Afiliados Netbox/Site institucional - Netbox/components/blog/articles/RichContent.tsx>) | Publicação mostra as mesmas dimensões, alinhamento e ordem do editor. |
| alterado | [Site institucional - Netbox/__tests__/blog/content.test.mjs](</D:/programas/Projetos de programação/Afiliados Netbox/Site institucional - Netbox/__tests__/blog/content.test.mjs>) | Testa dados não salvos, datas vazias, mídias e links inseguros na prévia. |
| alterado | [Site institucional - Netbox/.env.example](</D:/programas/Projetos de programação/Afiliados Netbox/Site institucional - Netbox/.env.example>) | Exemplo de BLOG_EDITOR_ORIGINS para autorizar os painéis. |
| alterado | [Site institucional - Netbox/docs/blog-management.md](</D:/programas/Projetos de programação/Afiliados Netbox/Site institucional - Netbox/docs/blog-management.md>) | Contrato da prévia, configuração, segurança e layout das mídias. |
| alterado | [Site institucional - Netbox/README.md](</D:/programas/Projetos de programação/Afiliados Netbox/Site institucional - Netbox/README.md>) | Documenta a rota de prévia e sua configuração. |
| alterado | [afiliados-backend/src/services/blogRichDocument.js](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados-backend/src/services/blogRichDocument.js>) | Valida width inteiro de 20 a 100 e align permitido; mantém compatibilidade. |
| alterado | [afiliados-backend/test/blogRichContent.test.js](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados-backend/test/blogRichContent.test.js>) | Testes de limites e persistência das propriedades das mídias. |
| alterado | [afiliados-backend/test/blogManagement.test.js](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados-backend/test/blogManagement.test.js>) | Teste real de reordenação, dimensões e isolamento/publicação por snapshot. |
| alterado | [afiliados-backend/docs/blog-management.md](</D:/programas/Projetos de programação/Afiliados Netbox/afiliados-backend/docs/blog-management.md>) | Documenta os novos atributos JSON e a prévia sem novos endpoints. |
| removido | `afiliados_netbox/src/app/integracoes/blog/components/RichContent.module.css` (arquivo removido; sem destino local) | Estilos exclusivos do renderer local, que não tem mais consumidores. |

## Organização

```text
afiliados_netbox/
  src/app/integracoes/blog/
    components/
      BlockEditor.tsx
      MediaToolbar.tsx + MediaToolbar.module.css
      ArticleEditor.tsx
      ArticlePreview.tsx + ArticlePreview.module.css
    richDocument.ts
    types.ts
    README.md
  docs/blog-media-preview.md
Site institucional - Netbox/
  app/(blog)/site/blog/preview/editor/page.tsx
  components/blog/articles/
    ArticlePage.tsx
    ArticleView.tsx
    LiveArticlePreview.tsx
    RichContent.tsx
  lib/blog/preview.ts
afiliados-backend/
  src/services/blogRichDocument.js
  test/blogRichContent.test.js
  test/blogManagement.test.js
```

Os controles e estilos permanecem junto do editor. O novo diretório de rota preview/editor mantém a prévia sob BlogLayout sem reservar um slug de artigo. ArticlePage mantém busca, metadata e JSON-LD; ArticleView concentra somente apresentação. O receptor e a normalização estão separados. O renderer local antigo foi removido depois de confirmar que perdeu seu único consumidor.

## Configuração e funcionamento

O painel usa NEXT_PUBLIC_BLOG_SITE_URL para a origem institucional (local: http://localhost:3002). A rota de prévia é /site/blog/preview/editor. O institucional aceita as origens exatas em BLOG_EDITOR_ORIGINS, separadas por vírgula; o padrão aceita http://localhost:3000 e http://127.0.0.1:3000. Em produção, configure a origem real e permita iframe na política da hospedagem.

A comunicação ocorre em memória por postMessage, com origem de destino exata. O receptor verifica origem permitida e janela pai, normaliza o conteúdo e confirma a aplicação. Atualizações são enviadas após 150 ms sem mudanças. O handshake sem dados pode usar destino público; rascunhos e confirmações usam origens exatas. Não são enviados tokens de autenticação; não há gravação, publicação ou conteúdo de artigo na URL. A rota possui noindex e não entra no sitemap.

O conteúdo continua como JSON tipado. A API rejeita largura não inteira ou fora de 20–100 e alinhamentos desconhecidos. As proporções são mantidas e a largura relativa se adapta à área de leitura. Documentos antigos continuam compatíveis. O tamanho e as margens são iguais na prévia e na página pública.

## Identidade visual

Referência consultada: [CSS Tabs — FreeFrontend](https://freefrontend.com/css-tabs/), adaptando agrupamento, estados ativos e transições ao padrão laranja do painel e às abas existentes. Ícones Feather da biblioteca react-icons já instalada: alinhamentos, setas, movimento, tamanho, remover/fechar, monitor, celular, recarga e olho. Sem novas bibliotecas.

A mídia selecionada recebe contorno laranja; o destino do arraste, uma linha indicadora; a mídia arrastada fica translúcida. Controles apresentam hover, estados pressionados e dicas acessíveis. Barra de mídia tem entrada suave; largura da moldura da prévia muda com transição. Os estilos dos novos componentes respeitam prefers-reduced-motion. O tamanho da própria mídia é atualizado diretamente, acompanhando o controle.

## Documentação

Os READMEs do painel, módulo editorial e institucional foram atualizados, junto das documentações de contrato do backend e do site e dos exemplos de ambiente. Este relatório registra os arquivos, arquitetura, configuração, identidade visual, verificações e limites.

## Validação

- Painel: ESLint dos arquivos TypeScript/TSX alterados, TypeScript e 4 testes de conversão/segurança aprovados.
- Backend: 7 testes aprovados, incluindo PostgreSQL real, upload autenticado, gravação, tamanho/alinhamento, reordenação e isolamento entre rascunho e snapshot público. O teste removeu seus registros e arquivos temporários.
- Institucional: ESLint dos arquivos alterados, TypeScript e 14 testes existentes/novos aprovados.
- Build Next.js do painel aprovado; build padrão Vinext do institucional aprovado, incluindo a nova rota.
- HTTP local da rota final: 200, layout editorial, estado de espera, rodapé e noindex presentes.
- Revisão visual e interação no navegador: não concluídas. A skill computer-use conseguiu listar a janela do Chrome, mas bloqueou o acesso por não conseguir confirmar a URL atual com confiança. Nenhuma alternativa foi usada para contornar o bloqueio.
- Sem implantação em produção.

## Limites

A prévia completa depende do institucional em execução e da configuração das origens. Após 12 segundos sem confirmação, há feedback de erro e opção de recarga. Em falha da API pública, os relacionados ficam vazios e o artigo recebido ainda pode ser exibido. Links dentro do iframe podem navegar; Recarregar prévia restaura a tela do artigo. Compartilhamento é visível e inerte na prévia.

Mover e redimensionar mídia diretamente não participa do histórico nativo de desfazer/refazer do texto. As setas e Alt+Seta para cima/baixo são alternativas ao arraste. O redimensionamento refere-se às mídias inseridas no conteúdo; os dois campos de imagem da aba Informações conservam suas funções de capa e imagem horizontal.


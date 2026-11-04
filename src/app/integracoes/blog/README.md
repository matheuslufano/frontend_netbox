# Blog Institucional

Gestão editorial em `/integracoes/blog`, criação em `/integracoes/blog/novo` e edição em `/integracoes/blog/[id]`. O card de `/integracoes` reutiliza `IntegrationCard`. O AppShell mantém a autenticação existente; todos os endpoints administrativos exigem usuário ativo ADMIN ou MANAGER no backend.

## Organização e fluxo

Na criação e edição, o editor tem três abas: **Informações do artigo** (título, slug, resumo, categoria, autor e capa), **Conteúdo** (folha de escrita com barra de ícones) e **Prévia** (artigo completo com os dados atuais). A navegação por abas aceita setas, Home e End. Os painéis de informações e conteúdo permanecem montados para preservar uploads, seleção e histórico de edição ao alternar entre eles.

As abas ficam na borda superior do painel, antes dos botões e do título, com aparência de abas de navegador. A aba ativa compartilha o fundo do painel e se conecta ao conteúdo pela borda inferior. `editorPage` remove o espaçamento externo apenas neste editor; `editorBody` mantém o espaçamento do conteúdo. O restante das páginas do Blog conserva seus estilos.

A barra superior mantém “Voltar aos artigos” à esquerda e “Visualizar prévia” à direita. O botão abre a terceira aba; “Fechar prévia” retorna à última aba de edição. Os botões de ação ficam disponíveis nas três abas, com ícones e seus rótulos. Ao salvar com dados obrigatórios inválidos em uma aba oculta, o editor abre Informações antes de focar e exibir a validação do campo.

A aba Conteúdo usa uma folha centralizada sobre fundo de trabalho, régua decorativa e rolagem própria sob a barra de ferramentas. Os comandos da barra exibem somente ícones, com rótulos acessíveis e dicas de identificação. Estilo, fonte e tamanho abrem menus com as opções por escrito. O layout se ajusta ao celular e ao tema escuro.

- `page.tsx`: listagem paginada (12 registros), indicadores globais, busca, filtros e agrupamento da página atual.
- `api.ts`: cliente Axios compartilhado, com o token e tratamento de erros existentes.
- `types.ts`: contratos do painel, status e geração de slug.
- `components/ArticleEditor.tsx`: carrega o registro por ID, salva, publica, despublica e arquiva.
- `components/ArticleInformation.tsx`: campos da primeira aba e integração da capa.
- `components/ArticleInformation.module.css`: organização visual em Sobre o artigo, Organização e Imagens do artigo, com adaptação ao celular e tema escuro.
- `components/EditorTabs.tsx` e `.module.css`: navegação acessível entre os três painéis.
- `components/EditorFormattingToolbar.tsx` e `.module.css`: comandos por ícones e seletores de formatação, preservando a seleção do editor.
- `components/BlockEditor.tsx`: escrita visual com títulos H2/H3, fontes Arial/Georgia/monoespaçada, três tamanhos, negrito/itálico/sublinhado, alinhamentos, listas, desfazer/refazer, links e mídias.
- `richDocument.ts`: conversão dos blocos antigos e serialização em JSON. A edição nativa usa `execCommand` para preservar seleção e histórico; o método é legado e deve ser reavaliado se o suporte dos navegadores mudar. Colagem entra como texto simples para evitar importar estilos e conteúdo executável.
- `components/ImagePicker.tsx` e `.module.css`: dois seletores independentes, com prévia, upload, URL manual, descrição acessível, estados de erro e remoção da seleção.
- `components/ArticlePreview.tsx` e `.module.css`: prévia completa por iframe do institucional, com alternância entre computador/celular e indicador de conexão.
- `components/MediaToolbar.tsx` e `.module.css`: largura percentual, alinhamento, movimento por setas e remoção da mídia selecionada.
- `components/EditorialImage.tsx`: imagens relativas são resolvidas na origem institucional, configurável por `NEXT_PUBLIC_BLOG_SITE_URL` (padrão `https://netbox.net.br`). Uploads retornam URLs absolutas do backend.
- `components/Categories.tsx`: criação e edição de nome/descrição; slug permanente para preservar referências.
- `blog.module.css`: estilos locais, modo claro/escuro e grades responsivas.

As categorias vêm do PostgreSQL. A criação usa UUID estável para permitir repetir a requisição sem duplicar. Edições usam `revision` para rejeitar sobrescritas concorrentes (409). O autor vem do usuário autenticado; o nome histórico permanece mesmo se o usuário for removido.

Salvar mantém a cópia de trabalho. Publicar valida título, slug, categoria, resumo, capa, alt e conteúdo e grava uma versão pública separada. Publicação é imediata; não há agendamento. Artigos demonstrativos legados são preservados. Não há exclusão definitiva: arquivamento/despublicação retiram o conteúdo da API.

O editor confirma descarte ao cancelar ou seguir links e usa `beforeunload` em recarga/fechamento. Em navegadores com Navigation API, também confirma voltar/avançar quando o evento é cancelável. Não há autosave nem persistência editorial em localStorage. Em navegadores sem essa API, o botão voltar durante navegação SPA não tem bloqueio garantido: salve antes de usá-lo.

## Integração real

### Duas imagens por artigo

A seção Imagens do artigo separa **Capa da obra** (original do filme, série ou jogo; prévia vertical 2:3) de **Imagem de slide/caixa** (prévia horizontal 16:9). As proporções orientam a composição, sem recortar o arquivo enviado. Cada imagem tem upload, remoção, descrição e campo de URL/caminho dentro de uma opção expansível. Falha no carregamento da prévia mostra uma mensagem e mantém a URL disponível para correção.

A capa da obra reutiliza `spotlight.poster` e sua descrição usa `spotlight.posterAlt`. O editor preserva o título de destaque e `trailerUrl` existentes. A imagem horizontal mantém `cover`/`coverAlt`, já consumidos pelo fundo e miniaturas do carrossel, pelos cards e pela abertura do artigo. A capa original aparece no pôster dos carrosséis que usam esse layout; categorias com abertura apenas de fundo continuam usando a imagem horizontal. A aba Prévia representa a página do artigo e usa a imagem horizontal, enquanto os dois arquivos podem ser conferidos na primeira aba.

O backend valida os dois campos e preserva ambos no snapshot publicado. Não há nova coluna nem migração: `spotlight` já existe como JSON. A capa original é opcional; a imagem horizontal e sua descrição continuam exigidas para publicar. Remover o pôster envia uma string vazia em `spotlight.poster`; omitir `spotlight` ou enviar `null` mantém o comportamento dos clientes antigos sem sobrescrever os dados existentes.

`POST /admin/blog/media` recebe os bytes da imagem com o mesmo token administrativo. Aceita JPG, PNG, WebP e GIF de até 8 MB e verifica a assinatura do arquivo. Uploads são salvos imediatamente; salvar/publicar o artigo continua separado. Remover imagens apenas remove a referência, preservando arquivos compartilhados. Salvar e publicar ficam bloqueados durante envios pendentes.

Vídeos aceitam YouTube, Vimeo ou URLs MP4/WebM, sem upload de vídeos. Os players não usam autoplay nem iframe fornecido pelo usuário. Imagens no conteúdo exigem descrição; a capa mantém seu campo próprio de texto alternativo.

Os blocos antigos continuam legíveis. Ao editar o conteúdo, o editor gera `Section.document` com blocos tipados e trechos formatados, junto com `paragraphs` em texto simples para busca e tempo de leitura. A API valida o documento e o preserva nos snapshots, sem migração de banco. Configuração do armazenamento: `afiliados-backend/docs/blog-management.md`.

O institucional **consulta** `GET /blog/articles` e `GET /blog/articles/:slug` neste backend usando `BLOG_API_URL`. Não existe API separada de recebimento de artigos; não foram inventados endpoints remotos ou tokens. O serviço `afiliados-backend/src/services/blogPublication.js` concentra o contrato de publicação.

`syncedAt` representa disponibilização na API, não confirmação de renderização no site. O painel mostra essa distinção. `publicSnapshot` impede que uma edição ainda não publicada apareça no site. Falhas são exibidas, preservam a cópia salva e podem ser tentadas novamente; `syncError`/`syncAttemptedAt` registram falhas de publicação quando o banco está disponível. Uma indisponibilidade total do banco impede registrar a própria falha.

O site configurado com API não usa fallback estático em erros/404, evitando reativar artigos despublicados. Sem `BLOG_API_URL`, continua em modo catálogo local. Categorias novas funcionam por links/filtros e nos artigos; os destaques e menus editoriais curados do site continuam com sua organização própria.

## Executar e validar (PowerShell)

### Mídias e prévia ao vivo

Selecione uma imagem ou vídeo na folha para abrir seus ajustes. A largura aceita 20% a 100% da área de texto, preservando a proporção original; alinhamento à esquerda, centro ou direita. Arraste o bloco até a indicação laranja entre os outros blocos. As setas do painel e Alt+Seta para cima/baixo oferecem alternativa ao arraste, inclusive no celular. A ordem, `width` e `align` são persistidos no JSON e no snapshot público. Blocos antigos sem essas propriedades continuam com largura total. Movimentos e redimensionamentos diretos do DOM não entram no histórico nativo de desfazer/refazer do texto.

“Mostrar prévia ao lado” mantém edição e página completa visíveis; em telas menores, a prévia fica abaixo. A terceira aba também usa a página completa. O iframe carrega `/site/blog/preview/editor` em `NEXT_PUBLIC_BLOG_SITE_URL`, reutilizando cabeçalho, rodapé e `ArticleView` públicos. O painel envia o estado atual por `postMessage` após 150 ms sem mudanças e confirma a aplicação; não salva nem publica, nem envia tokens administrativos. O receptor verifica origem, janela remetente e estrutura dos dados.

No institucional, configure `BLOG_EDITOR_ORIGINS` com as origens exatas permitidas, separadas por vírgula; o padrão permite localhost/127.0.0.1 na porta 3000. Em produção, inclua a origem HTTPS real do painel. A URL do institucional deve permitir incorporação pelo painel na configuração de segurança da hospedagem. A rota tem `noindex`, não entra no sitemap e não consulta rascunhos no banco. Compartilhamento fica inerte na prévia. Se a API pública falhar, a prévia continua sem relacionados. Após 12 segundos sem confirmação, mostra erro e permite recarregar. Recarregar também restaura a prévia se um link interno do iframe tiver sido aberto.

Backend, na pasta `afiliados-backend`:

```powershell
npm.cmd run db:migrate:deploy
npm.cmd run db:generate
$env:PORT='3001'
npm.cmd run dev
```

Frontend, na pasta `afiliados_netbox`, com `BACKEND_URL=http://localhost:3001` e `NEXT_PUBLIC_API_URL=/api-backend` no ambiente:

```powershell
npm.cmd run dev
```

Institucional: definir `BLOG_API_URL=http://localhost:3001` no ambiente do processo servidor. `BLOG_SITE_URL` no backend é opcional e deve conter o endereço público completo do blog (por exemplo `https://netbox.net.br/site/blog`). São reutilizados `DATABASE_URL` e `JWT_SECRET` existentes. Nenhuma credencial nova é necessária.

Para o ambiente local com Afiliados em `localhost:3000` e institucional em `localhost:3002`, definir `NEXT_PUBLIC_BLOG_SITE_URL=http://localhost:3002` no `.env.local` do Afiliados. O servidor institucional deve estar ativo: as capas `/blog/...` pertencem a ele. Após mudar a variável, recarregue o painel; reinicie `npm.cmd run dev` se o Next não recarregar o ambiente automaticamente. Em produção, use a origem pública onde as imagens foram implantadas, sem `/site/blog` no final.

```powershell
# Backend: cria registros descartáveis e remove apenas os registros do teste.
$env:BLOG_TEST_DATABASE='1'
node --test test/blogManagement.test.js
# Frontend
npm.cmd exec eslint -- src/app/integracoes/blog src/app/integracoes/page.tsx
npm.cmd exec tsc -- --noEmit
npm.cmd run build
# Institucional
npm.cmd test
npm.cmd run build
```

Não executar `blog:seed` para publicar alterações do painel. O importador preserva registros que já foram editados no gerenciamento.

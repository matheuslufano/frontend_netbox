# Blog Institucional

## Links internos na edição

O editor preserva links internos iniciados por uma única barra, incluindo query e fragmento, ao converter conteúdo antigo e renderizar o documento. A API também aceita esses links em `section.link.href` e nos trechos `document[].content[].href`, permitindo atualizar imagens sem rejeitar links já existentes. URLs HTTP(S) continuam aceitas; protocolos executáveis, barras invertidas e endereços iniciados por `//` continuam bloqueados. A correção requer atualizar o painel e o backend.

## Atualização individual e em lote

No menu **Ações do artigo**, **Atualizar artigo** envia as alterações salvas de um artigo publicado para o snapshot público, usando a revisão atual e o endpoint de publicação existente. Para rascunhos, arquivados e demonstrativos, utilize **Publicar** quando apropriado; a atualização não promove esses estados automaticamente.

Na seção de filtros, **Atualizar todos** atualiza todos os artigos com status `published`, de todas as páginas e independentemente da busca/categoria selecionadas. Há confirmação antes de publicar alterações, indicação de progresso e resultado com quantidade de sucessos e falhas por artigo. A operação lê todas as páginas antes de iniciar as gravações, evita IDs repetidos e mantém a proteção de revisão do backend. Conflitos não são sobrescritos nem repetidos automaticamente; falta de autorização interrompe os itens restantes. A operação não é uma transação única: sucessos anteriores permanecem publicados se outro artigo falhar. Mantenha a página aberta até o resultado.

Lógica em `articlePublication.ts`, controles em `CatalogActionMenu.tsx`/`CatalogFilters.tsx`, coordenação em `page.tsx` e testes em `tests/blogPublication.test.mjs`. Os IDs são `blog-article-action-update` e `blog-update-all-articles`. As permissões ADMIN/MANAGER continuam sendo verificadas pelo backend. Recarregar a listagem não é confundido com atualizar a publicação.

Na aba **Temas comemorativos**, o botão `theme-preview-site-toggle`, dentro de `theme-preview-controls`, alterna entre o site oficial e a Vercel. A escolha atualiza o iframe e o link de abrir em outra aba, preservando tema, escopo Blog/institucional, modo desktop/celular e posição início/rodapé. Não salva configurações. Os destinos são compartilhados com a prévia de artigos em `previewSites.ts`; os estilos existentes de `ThemeSettings.module.css` são reaproveitados.

## Destino da prévia do artigo

O botão com ícone de globo na barra de `ArticlePreview` alterna entre **Site oficial** (`NEXT_PUBLIC_BLOG_SITE_URL`, padrão `https://netbox.net.br`) e **Vercel** (`https://site-institucional-net-box-chi.vercel.app`). O texto informa o destino atual e o tooltip informa o próximo. A troca reinicia a conexão do iframe e envia o rascunho somente para a origem escolhida; não salva nem publica. A seleção vale enquanto essa prévia está aberta e inicia no site oficial. Computador/celular e recarregamento continuam disponíveis.

Os IDs usam prefixos próprios: `article-page-preview` para a aba e `article-side-preview` para a prévia lateral, com sufixos `-toolbar`, `-site-toggle`, `-desktop`, `-mobile`, `-reload` e `-frame`. O atributo `data-destination` identifica `official`/`vercel`. Estilos concentrados em `components/ArticlePreview.module.css`.

### Vercel consumindo os dados da máquina

No projeto institucional da Vercel, em **Settings → Environment Variables**, configure no ambiente **Production** (e **Preview** se usado):

```dotenv
BLOG_API_URL=https://afiliadobackend.apphuka.cloud
BLOG_EDITOR_ORIGINS=https://afiliado.netboxfibra.com.br
```

Faça um novo deploy após alterar as variáveis. `BLOG_API_URL` deve conter apenas a origem, sem `/blog/articles` ou `/site/blog`. O servidor da Vercel consulta a API HTTPS pública; PostgreSQL e credenciais do banco permanecem na máquina. Não configure a senha SSH ou `DATABASE_URL` na Vercel para essa integração. A publicação de artigos pelo painel atualiza o snapshot público consultado sem cache pelo institucional; salvar rascunho não publica. As duas prévias apontam ao mesmo conteúdo de produção, não a bancos separados.

`BLOG_EDITOR_ORIGINS` é uma lista de origens exatas separadas por vírgula; inclua localhost apenas se precisar de edição local. Ela autoriza o recebimento do rascunho via `postMessage`, independentemente da leitura dos artigos publicados por `BLOG_API_URL`. Na verificação de 12/11/2026, a Vercel retornou HTTP 200 para o Blog e para `/site/blog/preview/editor`, mas a prévia ainda autorizava somente `http://localhost:3000,http://127.0.0.1:3000`. O backend público retornou 34 artigos. Os valores privados configurados no painel da Vercel não foram inspecionados.

Para analytics desse domínio, o backend também precisa aceitar a origem Vercel em `BLOG_ANALYTICS_ORIGINS`, preservando as origens existentes. Isso é separado da leitura de artigos e não foi modificado nesta alteração. O site oficial não é publicado nem reconfigurado pelo botão.

## Temas comemorativos

A terceira aba, **Temas comemorativos**, configura separadamente o Blog e o site institucional. Há 13 ocasiões, ativação manual e prévia real em desktop (1280 px) ou celular, inclusive do rodapé. A prévia não salva; **Salvar alterações** persiste a seleção para o destino atual. Somente ADMIN/MANAGER podem ativar/desativar. Use `NEXT_PUBLIC_BLOG_SITE_URL` com a origem do institucional (local: `http://localhost:3002`). Os componentes e estilos estão em `components/themes/`. Contratos, migração e validação em [site-seasonal-themes.md](../../../../../afiliados-backend/docs/site-seasonal-themes.md).

## Catálogos por categoria

`imageCatalog.ts` escolhe Metron para `hqs`/`hq`/`quadrinhos`/`historias-em-quadrinhos`/`comics`, IGDB para `games`/`game`/`jogos` e TMDB nas demais categorias. ArticleInformation passa o slug para ImagePicker. CatalogImageModal substitui o antigo TmdbImageModal, reutilizando o layout, diálogo nativo, foco, paginação, seleção de formato e importação para o banco.

HQs: pesquisar nome da série, selecionar edição e importar capa. A busca de catálogo do campo horizontal fica desabilitada com explicação; upload e link continuam disponíveis. Jogos: buscar título, selecionar jogo e escolher capas ou artes/capturas horizontais. Trocar a categoria não remove imagens já selecionadas. O modal mostra o provedor e erros de configuração, limite ou indisponibilidade sem inventar resultados. Credenciais ficam apenas no backend; não há variável NEXT_PUBLIC nova. Detalhes: `afiliados-backend/docs/blog-image-catalogs.md`.

Ícones FiBookOpen/FiMonitor/FiFilm distinguem HQs, jogos e filmes/séries; estilos e transições existentes foram preservados. Referência: https://freefrontend.com/css-tabs/. Teste do roteamento: `node --test tests/blogImageCatalog.test.mjs`. Não há dependência nova.

## Excluir categorias

Em “Gerenciar categorias”, cada categoria tem ações Editar e Excluir com ícones FiEdit3/FiTrash2. Excluir pede confirmação com o nome, chama `DELETE /admin/blog/categories/:id` e atualiza listagem/contagem; limpa o formulário e o filtro quando apontavam para a categoria removida. Categorias com artigos têm exclusão desabilitada com orientação para mover os artigos primeiro. O backend também bloqueia vínculos concorrentes com 409 e exige ADMIN/MANAGER. Durante a operação, controles ficam desabilitados e o resultado é anunciado em `role=status`. Layout responsivo em `Categories.module.css`, foco visível e transições com redução de movimento; referência https://freefrontend.com/css-tabs/. Nenhuma migração ou dependência nova.

## Painel de artigos

`page.tsx` usa `catalog.module.css` e componentes separados para indicadores (`CatalogMetrics`), filtros (`CatalogFilters`), cards (`CatalogArticleCard`), menu (`CatalogActionMenu`) e paginação (`CatalogPagination`). A grade tem 4 colunas a partir de 1280 px, 3 entre 1024–1279, 2 entre 640–1023 e 1 abaixo de 640. O cabeçalho é compacto, os quatro indicadores reais compartilham uma barra e a toolbar mantém busca, categoria, status, ordenação e atualizar na mesma linha quando houver espaço. Queries são canceladas/debounced como antes; mudanças de filtro ou quantidade retornam à primeira página. Categorias continuam gerenciadas pelo componente existente.

Cada card abre a edição no clique normal e mostra imagem 16:9, badges, título em até três linhas, resumo em duas, autor e última atualização. O estado de disponibilidade diferencia versão pública atual, alterações pendentes, erros e artigos fora da API. Datas históricas ficam no tooltip da atualização. Agrupar por categoria reorganiza somente os itens da página atual, preservando a paginação do backend.

Clique direito, Shift+F10 ou três pontos abrem o mesmo menu único em portal. O menu é limitado à viewport, permite setas/Home/End, restaura foco no Escape/seleção e fecha em clique fora, perda de foco, rolagem externa ou resize. Abrir publicado só é habilitado para conteúdo público. Editar e ver prévia usam o editor existente (`?preview=1` seleciona a aba de prévia). Copiar link usa o endereço institucional configurado. Duplicar cria rascunho real com novo ID/endereço, autoria do usuário atual e referências às mesmas imagens. Publicar/despublicar e excluir exigem confirmação com o título. Exclusão é definitiva para o registro, preservando arquivos de mídia; revisões desatualizadas retornam conflito. Erros de ações mantêm os cards disponíveis e exibem mensagem.

`GET /admin/blog/articles` aceita `pageSize=12|24|48`, com padrão 12. A paginação mostra intervalo, total, páginas e controles primeiro/anterior/próximo/último. `POST /admin/blog/articles/:id/duplicate` recebe `{id,revision}`; `DELETE /admin/blog/articles/:id` recebe `{revision}`. Os endpoints usam as permissões de gerente existentes, sem migração. `catalogUtils.ts` concentra geometria do menu, paginação e apresentação do estado público. Testes: `node --test tests/blogCatalog.test.mjs tests/blogTrailer.test.mjs tests/blogRichDocument.test.mjs` e testes PostgreSQL do backend.

Ícones Lucide via `react-icons/lu` já instalado; menus, hover e foco respeitam redução de movimento e os temas claro/escuro. Referências: imagem do dashboard fornecida pelo usuário e https://freefrontend.com/css-tabs/. O redesign fica restrito à listagem: os estilos de edição permanecem em `blog.module.css` e seus módulos específicos.

O campo **Link do trailer** substitui o slug editável em Informações do artigo. Lê e grava `spotlight.trailerUrl`, já consumido pelo botão “Assistir trailer” no slide institucional. Aceita links HTTPS `youtube.com/watch?v=ID` (incluindo `www`/`m`) e `youtu.be/ID`, com ID de 11 caracteres; links incompatíveis bloqueiam a validação do formulário com orientação. Vazio remove o trailer. A alteração preserva pôster e demais metadados de `spotlight`. Salvar mantém o rascunho; publicar atualiza o snapshot público. Para novos artigos, o slug é gerado pelo título até o primeiro salvamento; artigos salvos preservam seu endereço. Não há nova API, coluna ou migração. Testes: `node --test tests/blogTrailer.test.mjs tests/blogRichDocument.test.mjs`.

Gestão editorial em `/integracoes/blog`, criação em `/integracoes/blog/novo` e edição em `/integracoes/blog/[id]`. O card de `/integracoes` reutiliza `IntegrationCard`. Consultas, criação, edição e imagens aceitam qualquer usuário ativo autenticado. Publicação, exclusão, duplicação e gestão de categorias exigem ADMIN ou MANAGER.

O campo Autor lista usuários ativos de `GET /admin/blog/authors`, por nome e ID, na criação e edição. Nome e foto vêm do cadastro real; `authorId` é enviado ao salvar. Avatar mostra a identidade selecionada e a prévia recebe a mesma foto. Sem seleção na criação, o servidor usa o usuário atual. Contas inativas já vinculadas são preservadas até escolher outro autor. Publicar atualiza nome e foto no snapshot; salvar mantém a versão pública. O Blog utiliza AuthorIdentity no artigo, com iniciais se a foto não existir ou falhar. Novas publicações exigem republicar para atualizar a foto de perfil.

O seletor usa FiUser, foco visível e transição suave com redução de movimento, seguindo o acabamento existente e a referência https://freefrontend.com/css-tabs/. Nenhuma dependência adicionada.

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

Os seletores usam grade 40/60 com 12 px entre cards. No desktop, os dois cards têm a mesma altura: o slide 16:9 define a altura natural, e a capa preenche a altura disponível com ações laterais de 38 px de largura. Ambas as imagens ocupam toda a área da prévia com object-fit: contain, preservando a imagem inteira sem recorte. Cabeçalhos, campos e espaçamentos são compactos. As ações usam apenas ícones Lucide com nomes acessíveis e tooltips; tamanho, traço e cor dos SVGs são explícitos para evitar ícones invisíveis ou comprimidos. Link expande o campo de URL com foco automático, mantendo-o sem espaço reservado quando fechado. A descrição e as orientações ficam na base. Em áreas de até 760 px, os cards se empilham e a capa tem prévia limitada a 280 px de altura. No celular, os botões mantêm alvo de 44 px. Upload, catálogo, URLs, persistência e callbacks permanecem iguais.

As caixas de informações, imagens, ações e resultados do catálogo usam `--editor-card` em cinza mais escuro que o fundo, borda definida e sombra discreta compartilhada por `--editor-shadow`. Cabeçalhos de imagem têm tom próprio (`--editor-header`), e os campos mantêm superfície contrastante com sombra interna suave. Os tokens têm variantes claras/escuras e ficam restritos ao editor, sem alterar a listagem ou as funcionalidades.

O editor usa controles compactos (34–36 px), campos e seções com espaçamentos reduzidos e fundo neutro que separa a área de trabalho dos cards. Na seção Imagens do artigo, os dois seletores ficam lado a lado quando a seção tem mais de 760 px de largura e se empilham em áreas menores. Ações principais usam rótulos curtos; remover imagem, despublicar, arquivar e paginação do catálogo priorizam ícones com nome acessível. Abas preservam navegação por teclado, e os temas claro/escuro mantêm superfícies distintas. O modal TMDB segue os mesmos tamanhos, com miniaturas menores e botões de formato compactos. Efeitos limitam-se a hover/foco e transições, respeitando redução de movimento. Referência visual: https://freefrontend.com/css-tabs/.

Falhas de consulta ao TMDB mostram somente o erro; “Nenhuma obra encontrada” e “Nenhuma imagem disponível” aparecem apenas em consultas concluídas sem erro. Após alterar `TMDB_READ_ACCESS_TOKEN`, reinicie o backend para carregar a configuração.

Nos dois seletores, **Buscar em filmes e séries** abre `TmdbImageModal`: busca paginada por nome no TMDB, seleção da obra e escolha entre pôsteres e imagens horizontais. O formato inicial acompanha o campo. A importação baixa o arquivo pelo backend, grava os bytes em `BlogMediaAsset` e preenche a URL local e a descrição com nome da obra/formato. A descrição continua editável. A importação é imediata; vincular ao artigo depende de salvar o rascunho, e publicar continua uma ação separada. Upload local e URL manual permanecem disponíveis.

Configuração: aplicar a migração `20261105120000_blog_media_assets` e gerar o Prisma Client no backend; definir `TMDB_READ_ACCESS_TOKEN` (somente servidor) e `BLOG_MEDIA_PUBLIC_URL` (origem pública do backend). O token do site institucional não é automaticamente compartilhado. Rotas administrativas autenticadas: `GET /admin/blog/tmdb/search?q=...&page=1`, `GET /admin/blog/tmdb/:kind/:id/images` e `POST /admin/blog/tmdb/import` com `{kind,id,path}`. `kind` aceita `movie` ou `tv`. Leitura pública dos arquivos: `GET /blog/media/assets/:id`. Downloads limitados a 8 MB, assinatura validada e caminho restrito ao CDN oficial e às imagens da obra. Remover seleção não exclui o arquivo do banco. Falhas de configuração/API são exibidas no modal. Não há nova dependência.

Componentes: `TmdbImageModal.tsx` e `.module.css` concentram busca, seleção, foco modal nativo, estados e layout responsivo. Ícones Feather via `react-icons/fi`; botões de formato com estado selecionado, hover e foco seguem a referência https://freefrontend.com/css-tabs/. Referência da integração: https://developer.themoviedb.org/reference/search-multi e https://developer.themoviedb.org/reference/movie-images.

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

# Entrega: Blog Institucional — 30/10/2026

Implementado módulo persistente no PostgreSQL, reutilizando os artigos, API de leitura, autenticação Express/Prisma e App Router existentes. Nenhuma implantação em produção foi realizada. Alterações anteriores dos três projetos foram preservadas.

## Funcionalidades

Card em `/integracoes`; painel em `/integracoes/blog`; criação e edição por ID; métricas reais; categorias dinâmicas com cadastro/edição; busca em título/resumo/conteúdo; filtros, ordenação e paginação; agrupamento dos resultados da página; editor de blocos com títulos, parágrafos, listas, links e imagens; prévia; publicação imediata, atualização, despublicação e arquivamento; proteção contra alterações concorrentes e duplicação em repetição de criação; confirmação de descarte e mensagens reais de erro/sucesso.

O site institucional já consumia a API do próprio backend. A integração usa esse contrato de leitura: publicar grava uma versão pública atômica, sem inventar endpoints de envio. Salvar edições preserva a versão pública anterior. `syncedAt` indica disponibilização na API, não confirmação de renderização no site.

## Arquivos criados ou modificados nesta tarefa

Os caminhos são relativos ao workspace pai. Links apontam aos arquivos locais correspondentes. Arquivos preexistentes não rastreados pelo Git foram tratados como conteúdo existente.

| Arquivo | Alteração e responsabilidade |
| --- | --- |
| [afiliados_netbox/src/app/integracoes/page.tsx](../src/app/integracoes/page.tsx) | Card Blog Institucional, reutilizando IntegrationCard |
| [afiliados_netbox/src/app/integracoes/blog/page.tsx](../src/app/integracoes/blog/page.tsx) | Painel, métricas reais, listagem e filtros |
| [afiliados_netbox/src/app/integracoes/blog/novo/page.tsx](../src/app/integracoes/blog/novo/page.tsx) | Rota de criação |
| [afiliados_netbox/src/app/integracoes/blog/[id]/page.tsx](../src/app/integracoes/blog/%5Bid%5D/page.tsx) | Rota de edição com params assíncronos |
| [afiliados_netbox/src/app/integracoes/blog/api.ts](../src/app/integracoes/blog/api.ts) | Serviço tipado com Axios compartilhado |
| [afiliados_netbox/src/app/integracoes/blog/types.ts](../src/app/integracoes/blog/types.ts) | Contratos, status e slug |
| [afiliados_netbox/src/app/integracoes/blog/blog.module.css](../src/app/integracoes/blog/blog.module.css) | Estilos locais, responsivos, claros/escuros |
| [afiliados_netbox/src/app/integracoes/blog/components/ArticleEditor.tsx](../src/app/integracoes/blog/components/ArticleEditor.tsx) | Carregamento, formulário, gravação, publicação e proteção de saída |
| [afiliados_netbox/src/app/integracoes/blog/components/BlockEditor.tsx](../src/app/integracoes/blog/components/BlockEditor.tsx) | Edição e ordenação de blocos estruturados |
| [afiliados_netbox/src/app/integracoes/blog/components/ArticlePreview.tsx](../src/app/integracoes/blog/components/ArticlePreview.tsx) | Prévia segura em React |
| [afiliados_netbox/src/app/integracoes/blog/components/EditorialImage.tsx](../src/app/integracoes/blog/components/EditorialImage.tsx) | Imagens da origem institucional |
| [afiliados_netbox/src/app/integracoes/blog/components/Categories.tsx](../src/app/integracoes/blog/components/Categories.tsx) | Cadastro e edição de categorias |
| [afiliados_netbox/src/app/integracoes/blog/README.md](../src/app/integracoes/blog/README.md) | Fluxos, arquitetura, configuração e limitações |
| [afiliados_netbox/.env.example](../.env.example) | Exemplo NEXT_PUBLIC_BLOG_SITE_URL sem credenciais |
| [afiliados_netbox/README.md](../README.md) | Entrada da documentação do módulo |
| [afiliados_netbox/docs/blog-implementation-report.md](blog-implementation-report.md) | Este relatório |
| [afiliados-backend/prisma/schema.prisma](../../afiliados-backend/prisma/schema.prisma) | Categorias, relações, revisão, snapshot e sincronização |
| [afiliados-backend/prisma/migrations/20261030170000_blog_management/migration.sql](../../afiliados-backend/prisma/migrations/20261030170000_blog_management/migration.sql) | Migração aditiva e backfill das categorias existentes |
| [afiliados-backend/prisma/migrations/20261030180000_blog_author_relation/migration.sql](../../afiliados-backend/prisma/migrations/20261030180000_blog_author_relation/migration.sql) | FK opcional do autor, SET NULL |
| [afiliados-backend/src/app.js](../../afiliados-backend/src/app.js) | Registro das rotas administrativas |
| [afiliados-backend/src/routes/blogAdminRoutes.js](../../afiliados-backend/src/routes/blogAdminRoutes.js) | Rotas com autorização ADMIN/MANAGER |
| [afiliados-backend/src/controllers/blogAdminController.js](../../afiliados-backend/src/controllers/blogAdminController.js) | CRUD, métricas, filtros, categorias e transições atômicas |
| [afiliados-backend/src/controllers/blogController.js](../../afiliados-backend/src/controllers/blogController.js) | Leitura da versão pública, preservando cópia de trabalho |
| [afiliados-backend/src/services/blogValidation.js](../../afiliados-backend/src/services/blogValidation.js) | Limites, validações, URLs e requisitos de publicação |
| [afiliados-backend/src/services/blogPublication.js](../../afiliados-backend/src/services/blogPublication.js) | Contrato isolado de disponibilização na API |
| [afiliados-backend/scripts/seed-blog.js](../../afiliados-backend/scripts/seed-blog.js) | Categorias no importador e preservação das edições administrativas |
| [afiliados-backend/test/blogManagement.test.js](../../afiliados-backend/test/blogManagement.test.js) | Validação e integração HTTP com PostgreSQL real |
| [afiliados-backend/docs/blog-management.md](../../afiliados-backend/docs/blog-management.md) | Endpoints, migrations, segurança e operação |
| [afiliados-backend/README.md](../../afiliados-backend/README.md) | Entrada da documentação administrativa |
| [Site institucional - Netbox/lib/blog/repository.ts](../../Site%20institucional%20-%20Netbox/lib/blog/repository.ts) | API sem cache de fetch; 404 não reativa catálogo local |
| [Site institucional - Netbox/types/blog.ts](../../Site%20institucional%20-%20Netbox/types/blog.ts) | Categoria dinâmica e imagem em bloco |
| [Site institucional - Netbox/components/blog/articles/ArticlePage.tsx](../../Site%20institucional%20-%20Netbox/components/blog/articles/ArticlePage.tsx) | Renderização de imagens dos blocos |
| [Site institucional - Netbox/components/blog/home/HomePage.tsx](../../Site%20institucional%20-%20Netbox/components/blog/home/HomePage.tsx) | Reconhecimento de filtros de categorias novas |
| [Site institucional - Netbox/docs/blog-management.md](../../Site%20institucional%20-%20Netbox/docs/blog-management.md) | Contrato e configuração do consumidor |
| [Site institucional - Netbox/README.md](../../Site%20institucional%20-%20Netbox/README.md) | Referência à administração pelo Afiliados |

## Banco, endpoints e execução

As duas migrations novas foram aplicadas com sucesso no PostgreSQL configurado em `127.0.0.1:5434/afiliados`. A migration anterior de artigos foi reaproveitada sem substituição. Os testes removeram somente os registros temporários que criaram.

Endpoints e contratos completos estão em [documentação do backend](../../afiliados-backend/docs/blog-management.md). Comandos de migration, desenvolvimento e testes estão no [README do módulo](../src/app/integracoes/blog/README.md#executar-e-validar-powershell).

Variáveis: DATABASE_URL e JWT_SECRET existentes no backend; BACKEND_URL e NEXT_PUBLIC_API_URL no Afiliados; NEXT_PUBLIC_BLOG_SITE_URL opcional para imagens; BLOG_API_URL no institucional; BLOG_SITE_URL opcional no backend para URL canônica. Não foram adicionadas credenciais ao código.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| Prisma validate | Aprovado |
| Prisma migrate deploy | Duas migrations aplicadas |
| Prisma generate | Bloqueado por EPERM ao substituir query_engine-windows.dll.node, inclusive fora do sandbox; os arquivos JS gerados reconheceram o modelo e o teste de banco passou com a DLL existente |
| node --test test/blogManagement.test.js com BLOG_TEST_DATABASE=1 | 2 testes aprovados; validação e fluxo integrado de autorização, persistência, conflito, publicação, despublicação e erro |
| Lint direcionado do Afiliados | Aprovado sem avisos após ajustes |
| TypeScript do Afiliados | Aprovado |
| Build Next.js do Afiliados | Aprovado; rotas do módulo incluídas |
| Lint global do Afiliados | 1 erro preexistente em components/profile/Avatar.tsx:34 (set-state-in-effect), 7 avisos fora do módulo |
| Testes do institucional | 13 aprovados |
| Lint direcionado e TypeScript do institucional | Aprovados |
| Build Vinext do institucional | Aprovado |
| node --check e git diff --check | Aprovados; Git avisou apenas sobre normalização LF/CRLF |
| HTTP local | /integracoes/blog na porta 3000: 200; /admin/blog/articles na porta 3001 sem token: 401; /site/blog na porta 3002: 200 |
| Revisão visual | Bloqueada: Computer Use não conseguiu determinar a URL atual do Chrome com segurança |

## Limitações e próximos cuidados

- Não foi realizada publicação/deploy em produção nem verificação visual de claro/escuro e responsividade; os estilos e estados foram implementados, mas isso não substitui revisão renderizada.
- Encerrar normalmente o processo local que mantém o Prisma carregado e executar `npm.cmd run db:generate` antes de reiniciar elimina a necessidade de substituir a DLL enquanto está em uso. A conclusão dessa geração ainda precisa ser verificada.
- Sem upload editorial, agendamento ou editor de HTML arbitrário. Imagens usam URL/caminhos existentes; conteúdo rico usa os blocos do contrato institucional.
- Navegadores sem Navigation API não têm bloqueio garantido de voltar/avançar em navegação SPA; cancelamento explícito, links e recarga possuem proteção.
- Categorias novas aparecem no painel e nos filtros/artigos públicos. Os menus e agrupamentos editoriais curados do institucional permanecem próprios e não são automaticamente redesenhados.
- A renderização de um artigo publicado no site não foi confirmada visualmente. Com BLOG_API_URL ausente, o site utiliza catálogo estático e não reflete o painel.

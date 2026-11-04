# Editor visual do Blog

## Resultado

A aba Informações foi reorganizada em Sobre o artigo, Organização e Imagens do artigo. A área de imagens tem dois seletores independentes: capa original da obra (pôster 2:3) e imagem horizontal de slide/caixa (16:9), ambos com prévia, upload, URL, descrição e remoção. Os campos usam `spotlight.poster`/`posterAlt` e `cover`/`coverAlt`, respectivamente; não foi necessária migração de banco. O carrossel público recebe a descrição do pôster, mantendo os cards ligados à imagem horizontal.

O `ArticleEditor.tsx` também passou a aceitar atualizações funcionais do artigo: a conclusão de um upload preserva a descrição e os metadados mais recentes da obra. Os dois envios continuam usando o contador de uploads existente para impedir salvamento antes de sua conclusão.

Validação desta atualização de imagens: ESLint dos componentes alterados e TypeScript aprovados nos dois frontends; build Next.js do painel e build padrão Vinext do institucional aprovados. Os 6 testes do backend passaram, incluindo persistência real em PostgreSQL, independência das imagens e publicação por snapshot; os 13 testes do institucional também passaram. Os registros e arquivos temporários dos testes foram removidos pelo próprio teste. A revisão visual não foi possível porque o host de acesso ao navegador está indisponível. Sem implantação em produção.

Nesta atualização foram alterados: `afiliados_netbox/src/app/integracoes/blog/components/ArticleInformation.tsx`, `ArticleInformation.module.css` (novo), `ImagePicker.tsx`, `ImagePicker.module.css` (novo), `EditorialImage.tsx`; `afiliados_netbox/src/app/integracoes/blog/types.ts`, `blog.module.css` e `README.md`; `afiliados_netbox/README.md`; `afiliados-backend/src/services/blogValidation.js`; `afiliados-backend/test/blogRichContent.test.js`, `blogManagement.test.js`; `afiliados-backend/docs/blog-management.md`; `Site institucional - Netbox/types/blog.ts`; `Site institucional - Netbox/components/blog/home/FeaturedNews.tsx` e `NewsCarousel.tsx`; `Site institucional - Netbox/docs/blog-management.md`; e este relatório. Os CSS específicos ficam ao lado dos componentes, e os estilos antigos do seletor foram retirados do CSS geral do módulo.

As abas foram posicionadas na borda superior do painel, acima de “Voltar aos artigos” e do título, seguindo a imagem de navegador fornecida e a referência [CSS Tabs](https://freefrontend.com/css-tabs/). A aba ativa se conecta visualmente ao corpo. Esta mudança envolve `ArticleEditor.tsx`, `EditorTabs.module.css` e `blog.module.css`, além do README do módulo e deste relatório, sem alterar a navegação ou os dados.

Validação deste reposicionamento: ESLint dos componentes e TypeScript aprovados; revisão do código e `git diff --check` sem erros. Não houve revisão visual no navegador nem nova compilação completa para este ajuste de layout.

Criação e edição em `/integracoes/blog/novo` e `/integracoes/blog/[id]` usam três abas: Informações do artigo, Conteúdo e Prévia. A segunda aba apresenta uma folha centralizada com régua, rolagem própria e ferramentas por ícones para títulos, fonte, tamanho, negrito, itálico, sublinhado, alinhamentos, listas, links, imagens e vídeos. O botão superior abre a terceira aba e “Fechar prévia” retorna à última aba de edição. Botões de salvar, publicar, despublicar, arquivar e voltar têm ícones junto aos rótulos.

A capa tem prévia, URL manual, envio do computador e remoção. Imagens inseridas no conteúdo também podem ser enviadas do computador. O upload é autenticado e persistente; excluir a seleção não apaga o arquivo no servidor. Salvamento/publicação aguardam os envios pendentes. Não há autosave.

Não foram adicionadas dependências ou migrações de banco. A extensão `Section.document` preserva conteúdo formatado em JSON, validado pelo backend e renderizado por React. Blocos antigos continuam funcionando; a conversão acontece quando o usuário edita o conteúdo. O texto simples derivado mantém busca e tempo de leitura.

## Arquivos alterados ou criados

Todos os caminhos abaixo são relativos à pasta de projetos `Afiliados Netbox`. Alterações anteriores não relacionadas foram preservadas.

| Arquivo | Responsabilidade e impacto |
| --- | --- |
| `afiliados_netbox/src/app/integracoes/blog/components/ArticleEditor.tsx` | Integra abas, validação de campos ocultos, ações com ícones e bloqueio durante upload. |
| `afiliados_netbox/src/app/integracoes/blog/components/ArticleInformation.tsx` | Agrupa os campos e a capa da primeira aba. |
| `afiliados_netbox/src/app/integracoes/blog/components/EditorTabs.tsx` | Navegação por teclado entre os três painéis, sem desmontar a edição. |
| `afiliados_netbox/src/app/integracoes/blog/components/EditorTabs.module.css` | Aparência das abas nos temas claro/escuro e no celular. |
| `afiliados_netbox/src/app/integracoes/blog/components/EditorFormattingToolbar.tsx` | Barra de ícones com dicas, nomes acessíveis e menus de formatação. |
| `afiliados_netbox/src/app/integracoes/blog/components/EditorFormattingToolbar.module.css` | Agrupamento visual dos comandos, menus e dicas. |
| `afiliados_netbox/src/app/integracoes/blog/components/BlockEditor.tsx` | Substitui os campos de blocos pela superfície visual e ferramentas de inserção. |
| `afiliados_netbox/src/app/integracoes/blog/components/ImagePicker.tsx` | Novo seletor reutilizável de capa com prévia/upload/remoção. |
| `afiliados_netbox/src/app/integracoes/blog/components/ArticlePreview.tsx` | Renderiza documentos novos ou blocos antigos. |
| `afiliados_netbox/src/app/integracoes/blog/components/RichContent.tsx` | Novo renderer React do documento formatado, com links e vídeos permitidos. |
| `afiliados_netbox/src/app/integracoes/blog/components/RichContent.module.css` | Estilos de texto e mídia da prévia. |
| `afiliados_netbox/src/app/integracoes/blog/richDocument.ts` | Contrato, compatibilidade com os blocos antigos e serialização segura do editor. |
| `afiliados_netbox/src/app/integracoes/blog/types.ts` | Campo opcional `document`, mantendo as propriedades existentes. |
| `afiliados_netbox/src/app/integracoes/blog/api.ts` | Upload binário com o cliente autenticado existente. |
| `afiliados_netbox/src/app/integracoes/blog/blog.module.css` | Barra de ferramentas, área editável, capa e painel responsivo. |
| `afiliados_netbox/src/app/integracoes/blog/README.md` | Fluxo, arquivos, persistência e limitações. |
| `afiliados_netbox/tests/blogRichDocument.test.mjs` | Testes da conversão, escape de HTML e URLs/embeds permitidos. |
| `afiliados_netbox/README.md` | Entrada para a documentação e comando de testes. |
| `afiliados_netbox/docs/blog-visual-editor.md` | Este relatório. |
| `afiliados-backend/src/services/blogRichDocument.js` | Valida tipos, limites, formatação, links e mídia. |
| `afiliados-backend/src/services/blogValidation.js` | Preserva documento validado e deriva o texto pesquisável. |
| `afiliados-backend/src/services/blogMedia.js` | Valida assinaturas e tamanho, salva com UUID em armazenamento configurável. |
| `afiliados-backend/src/routes/blogMediaRoutes.js` | Upload ADMIN/MANAGER e leitura pública dos arquivos. |
| `afiliados-backend/src/app.js` | Registra as rotas de mídia. |
| `afiliados-backend/.gitignore` | Exclui uploads de execução do versionamento. |
| `afiliados-backend/.env.example` | Exemplos de `BLOG_MEDIA_DIR` e `BLOG_MEDIA_PUBLIC_URL`. |
| `afiliados-backend/test/blogRichContent.test.js` | Validação do conteúdo e dos arquivos. |
| `afiliados-backend/test/blogManagement.test.js` | Integração PostgreSQL, autorização, upload/leitura e snapshot formatado. |
| `afiliados-backend/docs/blog-management.md` | Contrato, endpoints, armazenamento e testes. |
| `afiliados-backend/README.md` | Link para o módulo. |
| `Site institucional - Netbox/types/blog.ts` | Tipo opcional de documento no artigo público. |
| `Site institucional - Netbox/lib/blog/richDocument.ts` | Contrato e valores permitidos do renderer público. |
| `Site institucional - Netbox/components/blog/articles/RichContent.tsx` | Renderização pública da formatação e mídia. |
| `Site institucional - Netbox/components/blog/articles/RichContent.module.css` | Estilos locais da mídia e documento. |
| `Site institucional - Netbox/components/blog/articles/ArticlePage.tsx` | Seleciona renderer novo ou legado e resolve corretamente capas absolutas no JSON-LD. |
| `Site institucional - Netbox/docs/blog-management.md` | Documenta o contrato e o upload no backend. |
| `Site institucional - Netbox/README.md` | Entrada atualizada para a documentação. |

Os novos arquivos permanecem junto de suas funcionalidades; nenhuma reorganização ampla foi feita. O contrato equivalente nos dois frontends deve acompanhar futuras mudanças do validador do backend.

## Verificação

Na atualização para três abas, foram executados novamente o ESLint dos cinco componentes envolvidos, `tsc --noEmit`, os três testes de `tests/blogRichDocument.test.mjs` e `npm run build`: todos aprovados. A revisão visual desta atualização não foi possível porque o host de acesso ao navegador está indisponível. A alteração ficou restrita ao frontend: `ArticleEditor`, `ArticleInformation`, `EditorTabs` e seu CSS, `BlockEditor`, `EditorFormattingToolbar` e seu CSS, `blog.module.css`, README principal, README do módulo e este relatório. As verificações de backend e institucional abaixo pertencem à implementação anterior do editor e não foram repetidas nesta mudança de interface.

- Backend: 5 testes aprovados, incluindo integração real com PostgreSQL, upload autenticado, leitura pública, permissões e publicação. Os próprios registros e arquivos de teste foram removidos.
- Painel: 3 testes de conversão e segurança aprovados.
- Institucional: 13 testes existentes aprovados.
- Painel: ESLint do módulo, TypeScript e build Next.js aprovados.
- Institucional: ESLint dos componentes alterados, TypeScript e build padrão Vinext (`npm run build`) aprovados. O build alternativo Next.js (`npm run build:vercel`) falhou ao baixar as fontes externas Manrope e Sora do Google Fonts; não foi alterada a configuração de fontes.
- HTTP local: `/integracoes/blog/novo` respondeu 200; o endpoint de upload sem autenticação respondeu 401.
- Revisão visual: bloqueada pela ferramenta de controle do computador, que não conseguiu confirmar a URL atual do Chrome. Não foi possível testar o uso do editor no navegador nesta sessão.

## Operação e limites

Em produção, configure `BLOG_MEDIA_PUBLIC_URL` com a origem pública do backend e `BLOG_MEDIA_DIR` com um diretório persistente/volume. Inclua a pasta no backup junto com o banco. O padrão local é `uploads/blog` e a origem localhost do backend. Não há limpeza automática de arquivos sem referência.

Upload: JPG, PNG, WebP e GIF até 8 MB. Vídeos: YouTube, Vimeo e URLs MP4/WebM; sem upload de vídeo. Conteúdo colado entra como texto simples. A edição usa a API nativa legada `execCommand` para manter seleção e desfazer/refazer; o suporte deve ser acompanhado nos navegadores utilizados pelo projeto. Não aceita HTML/iframe arbitrário.

Alterações locais, sem implantação em produção.

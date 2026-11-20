This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

A aba **Desempenho** do Blog usa analytics reais com períodos, comparação, gráficos e detalhamento por artigo. Veja [arquitetura e uso](docs/blog-analytics.md).

O painel `/integracoes/blog` tem grade de quatro colunas no desktop grande, indicadores compactos, menu por clique direito/três pontos e paginação de 12/24/48 itens. Duplicação, publicação e exclusão usam a API real com confirmação e controle de revisão. Veja [documentação do Blog](src/app/integracoes/blog/README.md#painel-de-artigos).

No editor do Blog, o antigo campo de slug foi substituído pelo **Link do trailer**, integrado ao vídeo do slide institucional. Endereços dos artigos salvos são preservados; veja [documentação do módulo](src/app/integracoes/blog/README.md).

O editor do Blog e seu catálogo de imagens usam uma interface compacta, com botões padronizados, rótulos curtos e ações secundárias por ícones acessíveis. Detalhes em [documentação do módulo](src/app/integracoes/blog/README.md#duas-imagens-por-artigo).

Os dois campos de imagem do Blog também oferecem busca no TMDB em modal, importação para o banco do backend e descrição automática editável. Configuração e migração: [documentação do Blog](src/app/integracoes/blog/README.md#duas-imagens-por-artigo).

O gerenciamento do Blog em `/integracoes/blog` organiza a edição nas abas Informações do artigo, Conteúdo e Prévia, com folha de escrita, ferramentas por ícones e upload de imagens. A primeira aba separa a capa original da obra da imagem horizontal de slides/cards, cada uma com sua prévia e controles. Consulte [a documentação do módulo](src/app/integracoes/blog/README.md) para o contrato, configuração e limitações. Testes da conversão do conteúdo: `node --test tests/blogRichDocument.test.mjs`.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Tema da interface

O modo escuro usa a composição do [Superlist](https://www.superlist.com/) como
referência: grafite com subtom violeta, iluminação coral discreta, navegação leve
e superfícies de dados opacas. Conteúdo, marcas e imagens continuam próprios da Netbox.
O modo claro mantém seus estilos; todas as regras da reformulação são condicionadas
a `html[data-theme="dark"]`.

- `src/styles/dark-tokens.css`: paleta, hierarquia de superfícies, bordas, sombras,
  curvas de movimento e vidro exclusivo da navegação.
- `src/styles/dark-interactions.css`: feedback dos controles, foco visível, entrada
  por opacidade e política global de movimento reduzido no dark.
- `src/components/theme/ThemeAtmosphere.tsx` e seu CSS Module: dois planos de
  luz decorativos em CSS, sem estado cliente, eventos de scroll ou canvas.
- `ThemeProvider.tsx`: alternância existente e persistência em `netbox-theme`.
- `DynamicDarkMode.tsx` / `src/lib/themeColors.ts`: compatibilidade com cores
  legadas; imagens, logos, vídeos e áreas protegidas não são recoloridos.
- CSS Modules das funcionalidades: ajustes locais dos componentes, sempre com
  o seletor dark. Os tokens antigos `--nb-glass-*` permanecem compatíveis,
  mas painéis de dados agora são opacos; `--nb-chrome-*` controla a navegação.

Não aplique transformações ou filtros nos contêineres de página: eles podem
alterar o posicionamento de menus e diálogos fixos. O fundo fica em uma camada
isolada, sem interceptar cliques. No celular, a atmosfera é estática; o dark
respeita `prefers-reduced-motion`, `prefers-reduced-transparency` e
`prefers-contrast`, com fallback opaco para navegadores sem backdrop-filter.

Detalhes, arquivos alterados e validação: [documentação do modo dark](docs/dark-mode.md).

## Blog Institucional

Gestão real de artigos, categorias e publicação em `/integracoes/blog`. Consulte [a documentação do módulo](src/app/integracoes/blog/README.md) para arquitetura, estados, variáveis e validação.

O editor permite redimensionar, alinhar e reordenar imagens/vídeos. A prévia completa reutiliza o Blog institucional em tempo real, com modo ao lado da edição. Configuração e relatório: [mídias e prévia](docs/blog-media-preview.md).
# Autoria no Blog

O seletor de imagens do Blog escolhe Metron para HQs e IGDB para jogos (capas e horizontais), mantendo TMDB para filmes/séries. [Fluxo do editor](src/app/integracoes/blog/README.md).

O gerenciador de categorias do Blog oferece exclusão com confirmação e proteção de artigos vinculados. Veja [documentação do editor](src/app/integracoes/blog/README.md).

O editor permite selecionar usuários ativos como autores e mostra a foto do responsável. Consulte o fluxo e as permissões em [Blog](src/app/integracoes/blog/README.md).
# Créditos do rodapé

`src/components/layout/FooterCredits.tsx` adapta os créditos da campanha de 10 anos para Netbox Afiliados, com ano atual, nome da empresa e “Site desenvolvido por @Matheus Mota 🧑‍💻”. AppShell inclui o rodapé no login e nas telas autenticadas. O cartão do portfólio usa a imagem original em `public/images/matheus/portfolio-preview.png`, abre acima do nome por hover/foco e mantém link externo, transição de 180 ms e redução de movimento. O efeito não rastreia continuamente o cursor. CSS Modules acompanha os temas claro/escuro; o layout flexível reserva espaço ao rodapé inclusive no CRM sem alterar suas rotas ou permissões. Referências: CampaignFooter de netbox-10-anos e https://freefrontend.com/css-tabs/. Sem dependências novas.
# Configurações da Campanha Locomotiva

A tela `/campanha-locomotiva?secao=settings` organiza as regras em seis seções. O modelo base preenche campos operacionais e textos que estejam vazios, gera uma agenda futura e mantém as alterações como rascunho. Ele não substitui valores existentes, desloca reservas ativas nem identifica ou aprova uma pessoa responsável. O botão também completa campos vazios em campanhas existentes e renova a agenda vencida quando não há reserva ativa nas datas atuais.

A agenda configura a capacidade diária de 1 a 100 influenciadores. O sistema conta solicitações pendentes, reservas confirmadas e visitas realizadas contra esse limite; a data continua disponível enquanto houver capacidade e horários futuros. A antecedência mínima foi removida.

O painel usa `GET /admin/locomotiva` e `PUT /admin/locomotiva/config`. O PUT recebe `version` e uma `operation` de salvamento, revisão, aprovação, publicação ou fechamento. Salvar mantém a configuração pública vigente. A publicação não exige preenchimento ou aprovação dos documentos, mas continua validando agenda, regras operacionais e e-mail; só muda a versão pública quando as regras apresentadas ao participante mudam. O aceite dos termos pelo participante permanece exigido no formulário público. Fechar mantém solicitações e aceites anteriores. As versões e o rascunho administrativo ficam no JSON de configuração existente. Uma migração remove o índice que limitava reservas a uma por data, pois a capacidade agora é validada dentro da transação do backend.


Na seção de agenda, os horários podem ser marcados individualmente ou adicionados em uma faixa inclusiva de 30 em 30 minutos. Os períodos de almoço e jantar têm seletores próprios; horários personalizados já cadastrados continuam visíveis. A navegação entre painéis mostra ícones e rola horizontalmente em telas estreitas.

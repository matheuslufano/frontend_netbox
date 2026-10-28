# Identidade visual do modo escuro

A reformulação adapta os princípios visuais do [Superlist](https://www.superlist.com/)
à interface de afiliados Netbox. A referência foi observada em desktop, durante o
scroll e em celular: base escura com subtom violeta, halos difusos, contraste de
títulos, acentos coral, navegação leve e superfícies com separação discreta.
Nenhum conteúdo, imagem ou recurso proprietário da referência foi incorporado.

## Arquitetura e manutenção

```text
src/styles/
  globals.css                  # Reset, layout, tema claro e compatibilidade legada
  dark-tokens.css              # Contrato visual exclusivo do modo dark
  dark-interactions.css        # Foco, feedback e política de movimento
src/components/theme/
  ThemeAtmosphere.tsx          # Decoração renderizada sem estado cliente
  ThemeAtmosphere.module.css   # Halos e onda, isolados do conteúdo
```

A ativação permanece em `html[data-theme="dark"]`, com persistência em
`localStorage.netbox-theme` pelo `ThemeProvider` existente. O layout importa os
estilos e renderiza a atmosfera uma única vez. Não há dependências novas, mudanças
de autenticação, contratos de API ou configurações de ambiente.

Os tokens `--nb-surface*` separam fundo, painéis, controles e menus elevados.
`--nb-chrome-*` reserva a transparência para navegação, com fallback opaco.
`--nb-glass-*` continua atendendo componentes existentes, agora com superfícies
de dados opacas e reflexo mínimo. Não aplique blur ou transform em contêineres
que hospedem menus fixos: isso altera seu contexto de posicionamento.

A atmosfera usa uma camada fixa com `pointer-events: none`, `aria-hidden` e
isolamento visual no body dark. Halos usam deslocamento e opacidade em 28 s;
a onda se move em 34 s. No celular, o efeito é estático. Não há listeners de
scroll, partículas, canvas ou cálculos por frame em JavaScript.

Entradas de página e diálogos usam opacidade; os quatro cards da central têm
entrada com deslocamento de 8 px e intervalos de 40 ms. Controles compartilham
transições de 220 ms. Cards e menus recebem feedback por borda, superfície e
sombra. Os estados semânticos de negócio continuam distinguíveis.

`prefers-reduced-motion` desliga as animações e transições do dark;
`prefers-reduced-transparency` e `prefers-contrast: more` usam superfícies opacas,
sem halos e com bordas mais fortes. Foco por teclado tem contorno visível. O coral
primário novo (#cf4627) tem contraste calculado de 4,61:1 com branco; não se trata
de uma auditoria WCAG completa de conteúdo e componentes legados.

O modo claro não recebe esses seletores. Ao desenvolver novos componentes, use
os tokens e CSS Modules locais; mantenha protegidos logos, vídeos, imagens e
áreas com `data-dark-mode="preserve"` ou `data-theme-protected`. A camada dinâmica
continua adaptando cores legadas e limpa os atributos ao retornar ao claro.

## Arquivos desta reformulação

Os caminhos abaixo são relativos à raiz `D:\programas\Projetos de programação\Afiliados Netbox\afiliados_netbox`.
A coluna de linha identifica o primeiro ponto alterado em relação ao estado local
anterior à tarefa. Alterações locais anteriores foram preservadas.

| Arquivo | Linha | Responsabilidade |
| --- | ---: | --- |
| [README.md](../README.md) | 40 | Documentação de entrada e padrões do tema |
| [docs/dark-mode.md](dark-mode.md) | 1 | Arquitetura, referência, inventário e validação |
| [src/styles/dark-tokens.css](../src/styles/dark-tokens.css) | 1 | Novo contrato de cores, superfícies, vidro e acessibilidade |
| [src/styles/dark-interactions.css](../src/styles/dark-interactions.css) | 1 | Novos estados interativos, foco e movimento reduzido |
| [src/styles/globals.css](../src/styles/globals.css) | 32 | Extração dos tokens dark antigos e fundo transparente do shell |
| [src/components/theme/ThemeAtmosphere.tsx](../src/components/theme/ThemeAtmosphere.tsx) | 1 | Novo componente decorativo sem lógica cliente |
| [src/components/theme/ThemeAtmosphere.module.css](../src/components/theme/ThemeAtmosphere.module.css) | 1 | Novos halos, onda e redução de efeitos no celular |
| [src/app/layout.js](../src/app/layout.js) | 3 | Integração única da atmosfera e dos estilos |
| [src/lib/themeColors.ts](../src/lib/themeColors.ts) | 49 | Subtom coerente para conversão das cores neutras legadas |
| [src/components/layout/header.module.css](../src/components/layout/header.module.css) | 490 | Cabeçalhos normal e compacto; vidro reservado à navegação |
| [src/components/layout/sidebar.module.css](../src/components/layout/sidebar.module.css) | 1151 | Navegação lateral e inferior, estados ativos e menus |
| [src/components/layout/Sidebar.tsx](../src/components/layout/Sidebar.tsx) | 178 | Indicação acessível da rota atual por aria-current |
| [src/components/notifications/notifications.module.css](../src/components/notifications/notifications.module.css) | 311 | Botão de notificações, painel e backdrop dark |
| [src/components/report/report.module.css](../src/components/report/report.module.css) | 825 | Destaque do dashboard com superfície sóbria |
| [src/app/login/login.module.css](../src/app/login/login.module.css) | 201 | Login, campos, tipografia e ação primária |
| [src/app/links-campanhas/links-campanhas.module.css](../src/app/links-campanhas/links-campanhas.module.css) | 465 | Central, cards, ícones, entrada escalonada e relatório |
| [src/app/crm/crm.module.css](../src/app/crm/crm.module.css) | 106 | Kanban, painéis, controles, estados e ação Criar |
| [src/app/crm/CrmFilterHeader.module.css](../src/app/crm/CrmFilterHeader.module.css) | 430 | Filtros, agenda e menus com tokens compartilhados |
| [src/app/configuracoes/configuracoes.module.css](../src/app/configuracoes/configuracoes.module.css) | 2063 | Painéis administrativos, busca e opções |
| [src/app/campanhas/campanhas.module.css](../src/app/campanhas/campanhas.module.css) | 2329 | Listagem, seções, seleção de visualização e fundo |
| [src/app/criar-campanha/menu.module.css](../src/app/criar-campanha/menu.module.css) | 330 | Superfície do formulário de campanha |
| [src/app/integracoes/integracoes.module.css](../src/app/integracoes/integracoes.module.css) | 2005 | Cards e painéis de integrações |
| [src/app/links/links.module.css](../src/app/links/links.module.css) | 676 | Formulário, resultados e modal de links |
| [src/app/sgp/sgp.module.css](../src/app/sgp/sgp.module.css) | 2021 | Busca, sugestões, listas e pré-cadastro |

Foram criados quatro arquivos de implementação e este documento; nenhum arquivo
foi removido. Relatórios, WhatsApp e feedbacks já integrados aos tokens herdam a
nova paleta, sem alterações em suas regras de negócio.

## Validação executada

- `npm.cmd run build`: compilação e verificação TypeScript aprovadas.
- `npx.cmd tsc --noEmit`: aprovado.
- ESLint direcionado a layout, Sidebar, ThemeAtmosphere e themeColors: aprovado.
- `npm.cmd run lint`: bloqueado pelo erro preexistente em
  `src/components/profile/Avatar.tsx:34` (set-state-in-effect), além de sete avisos.
- `node --test tests/notifications.test.cjs`: oito testes aprovados e um falhou:
  a serialização ainda contém conteúdo que o teste de privacidade espera remover.
  Os arquivos de persistência e o teste não foram alterados por esta reformulação.
- Comparação estrutural com cópias anteriores: regras CSS não-dark preservadas
  nos 15 arquivos CSS alterados.
- Comparação dos estilos calculados do login claro com o registro anterior:
  aprovada; a interface de desenvolvimento do Next foi excluída da comparação
  com produção. A primeira comparação no servidor de desenvolvimento também passou.
- Alternância claro → dark → claro, limpeza de atributos dinâmicos, recolher e
  expandir sidebar, abrir e fechar notificações, agenda e foco por teclado: aprovados.
- Navegação automatizada por 17 rotas em 1440, 820 e 390 px: 51 navegações,
  todas HTTP 200, sem exceções, erros de console ou overflow horizontal da página.
- Conferência adicional em 1920 px e login em 320 px; movimento reduzido sem
  animações em execução. O Kanban mantém sua rolagem horizontal interna.
- O build final também passou por oito verificações adicionais (login, central, CRM e dashboard em desktop e celular), sem erros, incluindo preferência de contraste aumentado e movimento reduzido.
- Cinco rotas adicionais de edição de afiliado e relatórios foram abertas no
  build de produção, sem erros de renderização com os contratos simulados completos.
- Capturas de login, central, CRM, configurações, dashboard e notificações foram
  inspecionadas visualmente, incluindo exemplos em tablet e celular.

A revisão de interface utilizou Chromium local e respostas de API simuladas,
incluindo três negociações fictícias no CRM. Ela verifica renderização e interação
da interface; não valida autenticação real, gravações ou integrações externas.
Uma primeira navegação em desenvolvimento expirou durante compilação de rota;
a matriz completa foi concluída no build de produção em porta separada.

O projeto não foi publicado nem enviado ao Git. A revisão visual não substitui
validação com dados de produção ou com outros navegadores/dispositivos físicos.

## Cabeçalho aderente com vidro translúcido

O CSS Module do cabeçalho mantém as variantes normal e compacta no topo durante
a rolagem, com position: sticky (12 px em desktop e 8 px no celular). O espaço
original no fluxo é preservado, inclusive quando o cabeçalho quebra linhas.
O material é exclusivo do cabeçalho: fundo a 52% de opacidade, reflexo sutil,
blur de 26 px e saturação de 145%; no celular, o blur cai para 16 px. Sem suporte
a backdrop-filter, ou com preferência por contraste/transparência reduzida,
a superfície fica opaca. As regras claras e as ações não foram alteradas.

No dark, html e body usam overflow-x: clip em dark-interactions.css. Isso mantém
a contenção horizontal sem criar o ancestral de rolagem artificial que impedia
position: sticky de acompanhar a rolagem do documento.

Verificação deste ajuste: cabeçalhos normal e compacto permaneceram em 12 px
(desktop, 1440 px) e 8 px (celular, 390 px) durante rolagem real, sem overflow
horizontal. O navegador confirmou blur de 26/16 px, fallback sem filtro com
contraste aumentado e comportamento original do cabeçalho no modo claro.
Nenhuma exceção de renderização foi registrada nesses cenários.

## Visibilidade conforme a direção da rolagem

`src/components/layout/useHeaderScrollVisibility.ts` é compartilhado pelos
componentes `Header.tsx` e `CompactHeader.tsx`. No dark, uma descida de pelo menos
10 px oculta o cabeçalho; uma subida de 10 px o revela. Nos primeiros 80 px da
página ele permanece visível. A margem evita oscilações com pequenos movimentos.

O hook escuta scroll com listener passivo e agrupa atualizações em
requestAnimationFrame. Apenas o atributo data-scroll-hidden muda, sem renderizar
novamente o cabeçalho ou seus diálogos a cada movimento. Listeners e frames
pendentes são removidos ao trocar rota, tema ou desmontar o componente.

O CSS Module move o cabeçalho para fora da tela com translate e opacidade,
preservando seu espaço no layout. Foco dentro dele o revela imediatamente;
a agenda aberta ou controles expandidos também impedem a ocultação. O modo claro
mantém seu comportamento e prefers-reduced-motion elimina a transição.

Validação da visibilidade: versões normal e compacta testadas em 1440 e 390 px
com descida, subida, retorno ao topo e foco por teclado; agenda aberta, modo
claro e movimento reduzido também passaram. Build, TypeScript, ESLint dos três
módulos TypeScript alterados e git diff --check aprovados.

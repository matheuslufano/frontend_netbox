# Desempenho do Blog

Em `/integracoes/blog`, **Artigos** preserva catálogo, filtros, quatro colunas, menus e CRUD. **Desempenho** abre a análise sem recarregamento; componentes permanecem montados para preservar seleção/filtros ao alternar abas. Teclas de seta/Home/End navegam entre as abas principais.

O dashboard oferece Visão geral/Por artigo, períodos de 7/15/30/90 dias e intervalo personalizado (até 180 dias no backend), comparação com intervalo anterior, seis indicadores, gráfico diário com cinco séries, roscas e tabela. Os gráficos são SVG nativos, sem dependência adicional. Legendas alternam séries; mouse/toque e setas consultam valores diários. Roscas mostram absolutos e percentuais e oferecem legenda focalizável.

A tabela permite busca, categoria, ordenação e abertura dos detalhes de cada artigo, incluindo destinos de navegação. Ao voltar, filtros permanecem. Desktop mostra métricas completas; em telas pequenas a tabela simplifica colunas e permite rolagem horizontal. Estados de carregamento, erro, vazio e última atualização vêm da API real; nenhum número fictício é inserido.

## Organização

- `src/app/integracoes/blog/components/ManagementTabs.tsx`: navegação Artigos/Desempenho.
- `analytics/types.ts` e `analytics/api.ts`: contrato tipado e serviço Axios autenticado.
- `components/analytics/AnalyticsDashboard.tsx`: período, carregamento e seleção de artigo.
- `AnalyticsMetrics`, `AnalyticsLineChart`, `AnalyticsDonut`, `AnalyticsTable`: visualizações especializadas.
- `Analytics.module.css`: estilos responsivos, tema escuro, foco e movimento reduzido.

O backend deve aplicar a migração de analytics e o site deve enviar eventos com consentimento. Veja [contratos, métricas e operação](../../afiliados-backend/docs/blog-analytics.md) e [instrumentação do site](../../Site%20institucional%20-%20Netbox/docs/blog-analytics.md). Dados anteriores à instalação não são reconstruídos. Visitante não equivale a pessoa identificada, compartilhar não comprova envio, e acesso a outro artigo não equivale a leitura completa.

Abas compactas e destaque de seleção adaptam a referência [CSS Tabs do FreeFrontend](https://freefrontend.com/css-tabs/) à identidade existente, com ícones Lucide do pacote já instalado `react-icons/lu`, bordas discretas e transições de 160 ms.

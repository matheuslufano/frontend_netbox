This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

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

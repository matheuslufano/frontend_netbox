export type CatalogProvider = 'tmdb' | 'metron' | 'igdb';
export type CatalogWork = { id: number; kind: 'movie' | 'tv' | 'issue' | 'game'; title: string; year: string };
export type CatalogImage = { path: string; type: 'poster' | 'landscape'; preview: string; width: number; height: number };

/** Category slugs select the right provider without changing the article's existing images. */
export function imageCatalog(category = ''): CatalogProvider {
  if (['hqs', 'hq', 'quadrinhos', 'historias-em-quadrinhos', 'comics'].includes(category.toLowerCase())) return 'metron';
  if (['games', 'game', 'jogos'].includes(category.toLowerCase())) return 'igdb';
  return 'tmdb';
}
export const catalogLabels = {
  tmdb: { title: 'Filmes e séries · TMDB', search: 'Nome do filme ou série', credit: 'Imagens: TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.' },
  metron: { title: 'Capas de HQs · Metron', search: 'Nome da série de HQs', credit: 'Dados: Metron · CC BY-SA 4.0. Capas pertencem às editoras e aos criadores.' },
  igdb: { title: 'Jogos · IGDB', search: 'Nome do jogo', credit: 'Capas, artes e capturas de tela: IGDB. Imagens pertencem aos respectivos titulares.' },
} as const;

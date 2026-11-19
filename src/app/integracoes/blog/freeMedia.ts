export type FreeMediaMode = 'portrait' | 'landscape' | 'gif';
export type FreeMediaImage = {
  id: number;
  title: string;
  width: number;
  height: number;
  preview: string;
  license: 'CC0' | 'Public domain';
  author: string;
  source: string;
};
export type FreeMediaResults = { results: FreeMediaImage[]; nextOffset: number | null; warning?: string };

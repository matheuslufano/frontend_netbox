export type MetricKey =
  | "visitors"
  | "views"
  | "shares"
  | "trailers"
  | "multiReaders"
  | "multiRate"
  | "continuations";
export type Metric = { value: number; previous: number; change: number | null };
export type Daily = {
  date: string;
  visitors: number;
  views: number;
  shares: number;
  trailers: number;
  multiReaders: number;
};
export type AnalyticsArticle = {
  id: string;
  title: string;
  slug: string;
  cover: string;
  category: string;
  categoryLabel: string;
  updatedAt: string | null;
  visitors: number;
  views: number;
  shares: number;
  trailers: number;
  continuations: number;
};
export type AnalyticsReport = {
  period: {
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
    timeZone: string;
  };
  updatedAt: string;
  tracking: {
    firstEventAt: string | null;
    retentionDays: number;
    consentRequired: boolean;
    trailerTracking: string;
  };
  metrics: Record<MetricKey, Metric>;
  daily: Daily[];
  categories: { name: string; value: number }[];
  readers: { single: number; multiple: number };
  articles: AnalyticsArticle[];
  selectedArticle: AnalyticsArticle | null;
  navigation: {
    id: string;
    title: string;
    slug: string;
    visitors: number;
    events: number;
  }[];
};

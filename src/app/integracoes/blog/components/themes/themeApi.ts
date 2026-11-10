import api from '@/lib/api';

export type ThemeScope = 'blog' | 'institutional';
export type ThemeEffect = 'snow' | 'stars' | 'confetti' | 'petals' | 'hearts' | 'eggs' | 'flags' | 'bats';
export type SeasonalTheme = { id: string; name: string; occasion: string; effect: ThemeEffect; colors: string[]; greeting: string; description: string };
export type ThemeSetting = { scope: ThemeScope; themeId: string; enabled: boolean; revision: number; updatedAt: string | null };
export type ThemeConfiguration = { catalog: SeasonalTheme[]; settings: ThemeSetting[]; canManage: boolean };

export const themeApi = {
  read: async (signal?: AbortSignal) => (await api.get<ThemeConfiguration>('/admin/blog/themes', { signal })).data,
  save: async (setting: ThemeSetting) => (await api.put<ThemeSetting>(`/admin/blog/themes/${setting.scope}`, { themeId: setting.themeId, enabled: setting.enabled, revision: setting.revision })).data,
};

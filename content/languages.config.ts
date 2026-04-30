export const LANGUAGES = [
  { id: 'typescript', displayName: 'TypeScript', shikiLang: 'ts' },
  { id: 'javascript', displayName: 'JavaScript', shikiLang: 'js' },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]['id'];

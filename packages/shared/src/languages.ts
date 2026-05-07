export const LANGUAGES = [
  { id: 'typescript', displayName: 'TypeScript', shikiLang: 'ts' },
  { id: 'javascript', displayName: 'JavaScript', shikiLang: 'js' },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]['id'];

export const LANGUAGE_IDS: readonly LanguageId[] = LANGUAGES.map((l) => l.id);

export function isLanguageId(value: string): value is LanguageId {
  return (LANGUAGE_IDS as readonly string[]).includes(value);
}

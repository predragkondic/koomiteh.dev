import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import enPost from './locales/en/post.json';
import enAdmin from './locales/en/admin.json';
import enComments from './locales/en/comments.json';
import deCommon from './locales/de/common.json';
import dePost from './locales/de/post.json';
import deAdmin from './locales/de/admin.json';
import deComments from './locales/de/comments.json';

export const SUPPORTED_LOCALES = ['en', 'de'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const STORAGE_KEY = 'koomiteh.locale';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    nonExplicitSupportedLngs: true,
    ns: ['common', 'post', 'admin', 'comments'],
    defaultNS: 'common',
    resources: {
      en: {
        common: enCommon,
        post: enPost,
        admin: enAdmin,
        comments: enComments,
      },
      de: {
        common: deCommon,
        post: dePost,
        admin: deAdmin,
        comments: deComments,
      },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export default i18n;

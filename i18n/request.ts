import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';

const locales = ['tr', 'en'];

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(locales, requested) ? requested : 'tr';

  const messages = locale === 'en'
    ? (await import('../messages/en.json')).default
    : (await import('../messages/tr.json')).default;

  return { locale, messages };
});
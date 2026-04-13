/**
 * Shared currency formatting utility for the backend.
 * Supports standard ISO currencies with appropriate symbols and locales.
 */

const CURRENCY_CONFIG: Record<string, { symbol: string, locale: string }> = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  AED: { symbol: 'AED ', locale: 'en-AE' },
  CAD: { symbol: 'C$', locale: 'en-CA' },
  AUD: { symbol: 'A$', locale: 'en-AU' },
};

/**
 * Format an amount in subunits (paise/cents) to a localized string.
 * @param amount   Amount in subunits (e.g. 50000 for 500.00)
 * @param currency ISO 4217 Currency Code
 */
export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  const config = CURRENCY_CONFIG[currency.toUpperCase()] || { symbol: currency + ' ', locale: 'en-US' };
  
  const value = amount / 100;
  const formattedValue = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `${config.symbol}${formattedValue}`;
};

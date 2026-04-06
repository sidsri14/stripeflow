export const formatAmount = (paise: number, currency = 'INR') => {
  const symbol = currency === 'INR' ? '₹' : currency + ' ';
  return `${symbol}${(paise / 100).toLocaleString('en-IN')}`;
};

export const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export const daysSince = (dateStr: string) =>
  Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));

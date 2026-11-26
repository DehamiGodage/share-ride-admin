const TZ = 'Asia/Colombo';

export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ,
  });
}

export function formatDateTime(value) {
  if (!value) return '';
  const time = new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  });
  return `${formatDate(value)}, ${time}`;
}

export function formatRs(amount) {
  if (amount === null || amount === undefined) return '';
  return `Rs. ${Number(amount).toLocaleString('en-US')}`;
}
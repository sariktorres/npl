// Shared constants + helpers for the cricket CMS.

export const IMAGES = {
  hero: [
    'https://images.unsplash.com/photo-1554290995-b244e882cfa4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920',
    'https://images.unsplash.com/photo-1709078477781-3f885189ecbf?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920',
    'https://images.unsplash.com/photo-1617623504859-5d0603345834?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920',
  ],
  stadium: [
    'https://images.unsplash.com/photo-1568101794887-a7a3f149f6e6?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920',
    'https://images.unsplash.com/photo-1556764420-e37ef4cdfa5c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920',
    'https://images.unsplash.com/photo-1648179587771-b31e9eb33ecf?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920',
  ],
  gallery: [
    'https://images.unsplash.com/photo-1631194758628-71ec7c35137e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200',
    'https://images.unsplash.com/photo-1637635753380-20bf6f46ede0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200',
    'https://images.unsplash.com/photo-1786818920645-5759a6dd4040?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200',
    'https://images.unsplash.com/photo-1770681674108-db6428ea7ab5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200',
    'https://images.unsplash.com/photo-1624193757636-b829dfa06a1b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200',
    'https://images.unsplash.com/photo-1624526404491-2c735be4b243?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200',
  ],
};

// amounts are stored in Lakhs. 100 L = 1 Cr
export function money(lakhs) {
  const n = Number(lakhs || 0);
  if (n >= 100) return '\u20B9' + (n / 100).toFixed(2) + ' Cr';
  return '\u20B9' + n + ' L';
}

export function initials(name = '') {
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export function fmtOvers(o) {
  const n = Number(o || 0);
  return n.toFixed(1);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Deterministic (UTC-based) formatters so SSR and client markup match exactly.
export function fmtDate(d) {
  const x = new Date(d);
  if (isNaN(x)) return '';
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;
}
export function fmtTime(d) {
  const x = new Date(d);
  if (isNaN(x)) return '';
  return `${String(x.getUTCHours()).padStart(2, '0')}:${String(x.getUTCMinutes()).padStart(2, '0')}`;
}

export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Live', href: '/live' },
  { label: 'Fixtures', href: '/#fixtures' },
  { label: 'Points', href: '/#points' },
  { label: 'Teams', href: '/#teams' },
  { label: 'Auction', href: '/auction' },
  { label: 'News', href: '/#news' },
];

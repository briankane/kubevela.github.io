import released from '@site/versions.json';

// The newest KubeVela minor these docs have a released version for; anything newer is the docs' Next.
const key = (v) => v.replace(/^v/, '').split('.').map(Number);
const newer = (a, b) => {
  const [x, y] = [key(a), key(b)];
  return x[0] !== y[0] ? x[0] > y[0] : x[1] > y[1];
};
const NEWEST = released.reduce((a, b) => (newer(b, a) ? b : a));

// kubevelaLabel names a KubeVela minor as the docs do: Next until it is released.
export const kubevelaLabel = (minor) => (newer(minor, NEWEST) ? 'Next' : minor);

// kubevelaList reads a list of minors as "KubeVela 1.10, 1.11 and Next".
export function kubevelaList(list) {
  const l = list.map(kubevelaLabel);
  if (!l.length) {
    return '';
  }
  return l.length > 1 ? `KubeVela ${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}` : `KubeVela ${l[0]}`;
}

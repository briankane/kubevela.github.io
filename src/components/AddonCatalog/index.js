import React, {useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {kubevelaList as kubevela} from '@site/src/components/addon-kubevela';
import styles from './styles.module.css';

// The catalog's tabs. KubeVela's own addons have a tab of their own, whichever registry they are in.
const KUBEVELA = 'KubeVela';
const TABS = [
  ['verified', 'Verified', (a) => !a.experimental && a.category !== KUBEVELA],
  ['kubevela', 'KubeVela', (a) => a.category === KUBEVELA],
  ['experimental', 'Experimental', (a) => a.experimental && a.category !== KUBEVELA],
  ['all', 'All', () => true],
];

// byCategory groups addons by category: KubeVela first, then by name, with uncategorised ones last as Other.
function byCategory(addons) {
  const groups = new Map();
  for (const a of addons) {
    const c = a.category || 'Other';
    groups.set(c, [...(groups.get(c) || []), a]);
  }
  const rank = (c) => (c === KUBEVELA ? 0 : c === 'Other' ? 2 : 1);
  return [...groups].sort(([x], [y]) => rank(x) - rank(y) || x.localeCompare(y));
}

// Logo is the addon's own logo on a light tile, which keeps dark logos readable in the dark theme, or its initial
// where it has none.
function Logo({addon}) {
  const src = useBaseUrl(addon.logo || '/');
  return (
    <span className={styles.logo} aria-hidden="true">
      {addon.logo ? <img src={src} alt="" loading="lazy" /> : addon.name[0].toUpperCase()}
    </span>
  );
}

// AddonCatalog is the catalog's front page: every addon as a card, filtered by what the reader types and by
// tab, grouped by category. It opens on the verified addons; KubeVela's own and the experimental ones are a tab away.
// `addons` is addons/catalog/index.json.
export default function AddonCatalog({addons}) {
  const [query, setQuery] = useState('');
  const [registry, setRegistry] = useState('verified');
  const inTab = (id) => addons.filter(TABS.find(([t]) => t === id)[2]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inTab(registry).filter(
      (a) => !q || [a.name, a.description, a.category || '', ...a.tags].some((s) => s.toLowerCase().includes(q)),
    );
  }, [addons, query, registry]);

  if (!addons.length) {
    return (
      <p>
        The generated catalog isn't part of this build: it is read from the <code>docs-site</code> branch of{' '}
        <a href="https://github.com/kubevela/catalog">kubevela/catalog</a> when the site is built.
      </p>
    );
  }
  return (
    <>
      <div className={styles.controls}>
        <input
          className={styles.search}
          type="search"
          placeholder={`Search ${inTab(registry).length} addons`}
          aria-label="Search the addons"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.tabs} role="group" aria-label="Registry">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={styles.tab}
              aria-pressed={registry === id}
              onClick={() => setRegistry(id)}>
              {label} ({inTab(id).length})
            </button>
          ))}
        </div>
      </div>
      {byCategory(shown).map(([category, group]) => (
        <section key={category}>
          <h2 className={styles.category}>{category}</h2>
          <div className={styles.grid}>
            {group.map((a) => (
              <Link key={a.name} className={styles.card} to={`/addons/catalog/${a.name}/`}>
                <div className={styles.head}>
                  <Logo addon={a} />
                  <span className={styles.title}>
                    <span className={styles.name}>{a.name}</span>
                    <span className={styles.version}>{a.latest}</span>
                  </span>
                </div>
                {a.description && <p className={styles.desc}>{a.description}</p>}
                <div className={styles.foot}>
                  {a.experimental && <span className={styles.badge}>Experimental</span>}
                  <span className={styles.for}>{kubevela(a.for)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {!shown.length && <p className={styles.none}>No addon matches “{query}”.</p>}
    </>
  );
}

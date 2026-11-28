import React, {useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const kubevela = (list) =>
  list.length > 1 ? `KubeVela ${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list.length ? `KubeVela ${list[0]}` : '';

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
// registry. It opens on the verified addons; experimental ones are a tab away. `addons` is
// addons/catalog/index.json.
export default function AddonCatalog({addons}) {
  const [query, setQuery] = useState('');
  const [registry, setRegistry] = useState('verified');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return addons.filter(
      (a) =>
        (registry === 'all' || (registry === 'experimental') === a.experimental) &&
        (!q || [a.name, a.description, ...a.tags].some((s) => s.toLowerCase().includes(q))),
    );
  }, [addons, query, registry]);

  if (!addons.length) {
    return (
      <p>
        The generated catalog isn't part of this build. The <Link to="/addons/overview">addon overview</Link> lists the
        addons with pages of their own.
      </p>
    );
  }
  const count = (exp) => addons.filter((a) => a.experimental === exp).length;
  return (
    <>
      <div className={styles.controls}>
        <input
          className={styles.search}
          type="search"
          placeholder={`Search ${registry === 'all' ? addons.length : count(registry === 'experimental')} addons`}
          aria-label="Search the addons"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.tabs} role="group" aria-label="Registry">
          {[
            ['verified', `Verified (${count(false)})`],
            ['experimental', `Experimental (${count(true)})`],
            ['all', `All (${addons.length})`],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={styles.tab}
              aria-pressed={registry === id}
              onClick={() => setRegistry(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.grid}>
        {shown.map((a) => (
          <Link key={a.name} className={styles.card} to={`/addons/catalog/${a.name}/`}>
            <div className={styles.head}>
              <Logo addon={a} />
              <span className={styles.name}>{a.name}</span>
              <span className={styles.version}>{a.latest}</span>
            </div>
            {a.description && <p className={styles.desc}>{a.description}</p>}
            <div className={styles.foot}>
              {a.experimental && <span className={styles.badge}>Experimental</span>}
              <span className={styles.for}>{kubevela(a.for)}</span>
            </div>
          </Link>
        ))}
      </div>
      {!shown.length && <p className={styles.none}>No addon matches “{query}”.</p>}
    </>
  );
}

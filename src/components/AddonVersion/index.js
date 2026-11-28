import React from 'react';
import Link from '@docusaurus/Link';
import {useHistory} from '@docusaurus/router';
import {kubevelaList as kubevela} from '@site/src/components/addon-kubevela';
import styles from './styles.module.css';

// The version picker and older-version banner on a generated addon page. `data` is the addon's versions.json:
// the versions that have pages, which KubeVela releases each was for, and which pages each has.
const href = (data, version, page) => {
  const v = data.versions.find((x) => x.version === version);
  const target = v && v.pages.includes(page) ? page : '';
  const base = `/addons/catalog/${data.name}/${version === data.latest ? '' : `${version}/`}`;
  return base + (target ? `${target}/` : '');
};

export default function AddonVersion({data, current, page}) {
  const history = useHistory();
  const v = data.versions.find((x) => x.version === current);
  const isLatest = current === data.latest;
  return (
    <>
      <div className={styles.bar}>
        <label className={styles.label} htmlFor="addon-version">Version</label>
        <select
          id="addon-version"
          className={styles.select}
          value={current}
          onChange={(e) => history.push(href(data, e.target.value, page))}>
          {data.versions.map((x) => (
            <option key={x.version} value={x.version}>
              {x.version}
              {x.version === data.latest ? ' (latest)' : x.deprecated ? ' (deprecated)' : ''}
              {` · ${kubevela(x.for)}`}
            </option>
          ))}
        </select>
      </div>
      {!isLatest && v && (
        <div className={`alert ${v.deprecated ? 'alert--warning' : 'alert--info'} ${styles.banner}`} role="note">
          {v.deprecated ? (
            <>
              <strong>{data.name} {current} is deprecated.</strong> It was the current version for{' '}
              {kubevela(v.for)}, which KubeVela no longer supports.{' '}
            </>
          ) : (
            <>
              <strong>An older version:</strong> {data.name} {current}, for {kubevela(v.for)}.{' '}
            </>
          )}
          The latest is <Link to={href(data, data.latest, page)}>{data.latest}</Link>.
        </div>
      )}
    </>
  );
}

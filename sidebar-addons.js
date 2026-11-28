// Sidebar for the Addons section (/addons). Its pages describe the addons in the catalog as they are now, so the
// section is not versioned.
const fs = require('fs');
const path = require('path');
const { readAddonCatalog } = require('./scripts/addon-catalog');

// addonItem lists an addon's pages in the version the catalog calls latest: its overview as the category's link,
// then parameters, definitions, guide and versions. Older versions' pages are reached from the version menu.
function addonItem(addon) {
  const dir = `catalog/${addon.name}`;
  const pages = addon.pages.filter((p) => p !== '');
  const definitions = pages.filter((p) => p.startsWith('definitions/')).map((p) => `${dir}/${p}`);
  const others = pages.filter((p) => !p.startsWith('definitions/') && p !== 'versions').map((p) => `${dir}/${p}`);
  const guide = fs.existsSync(path.join(__dirname, 'addons', dir, 'guide.md')) ? [`${dir}/guide`] : [];
  return {
    type: 'category',
    label: addon.name,
    // Its logo, from the stylesheet scripts/addon-catalog.js writes.
    className: addon.logo ? `addon-sidebar-logo addon-sidebar-logo-${addon.name}` : undefined,
    link: { type: 'doc', id: `${dir}/index` },
    items: [
      ...others,
      ...(definitions.length ? [{ type: 'category', label: 'Definitions', items: definitions }] : []),
      ...guide,
      ...(pages.includes('versions') ? [`${dir}/versions`] : []),
    ],
  };
}

// catalog is the generated catalog: the verified addons by category, KubeVela's own first. Experimental addons are
// left out of the sidebar and found from the catalog page. Without the generated pages it is the catalog page alone.
function catalog() {
  const groups = new Map();
  for (const a of readAddonCatalog().filter((x) => !x.experimental)) {
    const c = a.category || 'Other';
    groups.set(c, [...(groups.get(c) || []), a]);
  }
  const rank = (c) => (c === 'KubeVela' ? 0 : c === 'Other' ? 2 : 1);
  return {
    type: 'category',
    label: 'Addon Catalog',
    collapsed: false,
    link: { type: 'doc', id: 'catalog' },
    items: [...groups]
      .sort(([x], [y]) => rank(x) - rank(y) || x.localeCompare(y))
      .map(([label, addons]) => ({ type: 'category', label, collapsed: true, items: addons.map(addonItem) })),
  };
}

module.exports = {
  addons: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      link: {type: 'doc', id: 'getting-started/introduction'},
      items: ['getting-started/install', 'getting-started/quick-start'],
    },
    // The catalog is what most readers come for, so it sits right under Getting Started.
    catalog(),
    {
      type: 'category',
      label: 'Guides',
      collapsed: true,
      // Managing addons is vela-core behaviour, so these guides stay in the KubeVela docs.
      items: [
        {type: 'link', label: 'Install and Manage Addons', href: '/docs/end-user/components/more'},
        {type: 'link', label: 'Air-gapped Installation', href: '/docs/platform-engineers/system-operation/offline-installation'},
        {type: 'link', label: 'Canary Rollout', href: '/docs/tutorials/helm-rollout'},
        {type: 'link', label: 'Observability', href: '/docs/platform-engineers/operations/observability'},
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      collapsed: true,
      link: {type: 'doc', id: 'examples/overview'},
      items: [
        'examples/kustomize-from-git',
        'examples/expose-with-ingress-nginx',
        'examples/https-with-cert-manager',
        'examples/write-an-addon',
        'examples/host-an-addon-registry',
      ],
    },
    {
      type: 'category',
      label: 'Contributor Onboarding',
      collapsed: true,
      link: {type: 'doc', id: 'developer/overview'},
      items: [
        'developer/make-your-own-addon',
        'developer/addon-application',
        'developer/addon-reference',
        'developer/test-locally',
        'developer/addon-registry',
        'developer/contribute',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: false,
      link: {type: 'generated-index', slug: '/reference', description: 'Which addon versions work with which KubeVela releases.'},
      items: [
        'reference/versions',
      ],
    },
  ],
};

// addon-catalog puts the generated addon catalog pages in addons/catalog/ before the docs load, and writes
// addons/catalog/index.json, the list the catalog page and the sidebar read. Each addon's logo is also served from
// /addon-logos/, for the catalog page's cards.
//
// The pages come from a local generator run when ADDON_CATALOG_DIR names one, otherwise from the docs-site branch
// of kubevela/catalog (ADDON_CATALOG_REPO and ADDON_CATALOG_BRANCH override it). With neither, the site builds
// without the catalog: the index is empty and the sidebar keeps the hand-written addon pages.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const DEST = path.join(__dirname, '..', 'addons', 'catalog');
const INDEX = path.join(DEST, 'index.json');
// A static directory of the site's (see docusaurus.config.js), holding addon-logos/.
const STATIC_DIR = path.join(__dirname, '..', '.addon-catalog-static');
const LOGOS = path.join(STATIC_DIR, 'addon-logos');
const REPO = process.env.ADDON_CATALOG_REPO || 'https://github.com/kubevela/catalog.git';
const BRANCH = process.env.ADDON_CATALOG_BRANCH || 'docs-site';

// copyPages fills DEST from the local run or the branch, and returns where the pages came from.
function copyPages() {
  const local = process.env.ADDON_CATALOG_DIR;
  if (local) {
    fs.cpSync(local, DEST, { recursive: true });
    return local;
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'addon-catalog-'));
  try {
    execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', BRANCH, REPO, tmp], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    fs.cpSync(tmp, DEST, { recursive: true, filter: (src) => path.basename(src) !== '.git' });
    return `${REPO}#${BRANCH}`;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// readIndex lists each addon from its versions.json, sorted by name, and copies its logo, if it has one, to LOGOS.
function readIndex() {
  return fs
    .readdirSync(DEST, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(DEST, d.name, 'versions.json')))
    .map((d) => {
      const v = JSON.parse(fs.readFileSync(path.join(DEST, d.name, 'versions.json'), 'utf8'));
      const latest = v.versions.find((x) => x.version === v.latest) || v.versions[0];
      let logo = '';
      if (v.logo) {
        logo = `${v.name}${path.extname(v.logo)}`;
        fs.copyFileSync(path.join(DEST, d.name, v.logo), path.join(LOGOS, logo));
        logo = `/addon-logos/${logo}`;
      }
      return {
        name: v.name,
        description: v.description || '',
        experimental: Boolean(v.experimental),
        tags: v.tags || [],
        logo,
        latest: v.latest,
        for: latest ? latest.for : [],
        pages: latest ? latest.pages : [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function loadAddonCatalog() {
  fs.rmSync(DEST, { recursive: true, force: true });
  fs.rmSync(STATIC_DIR, { recursive: true, force: true });
  fs.mkdirSync(LOGOS, { recursive: true });
  let addons = [];
  try {
    const from = copyPages();
    addons = readIndex();
    console.log(`[addon-catalog] ${addons.length} addons from ${from}`);
  } catch (e) {
    const cause = (e.stderr && e.stderr.toString().trim()) || e.message;
    console.warn(`[addon-catalog] building without the addon catalog: ${cause}`);
    fs.rmSync(DEST, { recursive: true, force: true });
  }
  fs.mkdirSync(DEST, { recursive: true });
  fs.writeFileSync(INDEX, JSON.stringify({ addons }, null, 2));
  return addons;
}

// readAddonCatalog returns the index loadAddonCatalog wrote, or no addons before it has run.
function readAddonCatalog() {
  try {
    return JSON.parse(fs.readFileSync(INDEX, 'utf8')).addons;
  } catch {
    return [];
  }
}

module.exports = { loadAddonCatalog, readAddonCatalog, STATIC_DIR };

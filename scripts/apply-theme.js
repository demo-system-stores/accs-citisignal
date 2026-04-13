/**
 * Theme tokens stored in DA `stylesheet.json` (keys become `--{key}` on :root).
 * Kept in sync with page metadata fields in models/_page.json.
 */
export const THEME_STYLESHEET_KEYS = [
  'theme-primary',
  'theme-secondary',
  'primary-text',
  'secondary-text',
  'menu-background',
  'menu-text-color',
  'fonts',
];

/** Attribute on the injected theme style element in document.head (idempotent updates). */
export const THEME_STYLE_ATTR = 'data-accs-stylesheet-root';

const DA_TOKEN_URL = 'https://285361-demosystemcommerce-devpankaj.adobeioruntime.net/api/v1/web/dsc-eds-api/da-access-token';
  
export function parseDaSiteContext() {
  const host = window.location.hostname;
  const hostParts = host.split('--');
  let org = '';
  let repo = '';
  if (hostParts.length >= 3) {
    const [, repoPart, orgHostPart] = hostParts;
    repo = repoPart;
    const [orgFromHost] = orgHostPart.split('.');
    org = orgFromHost;
  }
  if (!org || !repo) {
    org = 'demo-system-stores';
    repo = 'accs-citisignal-dev';
  }
  return { org, repo };
}

export function getStylesheetSourcePath(org, repo) {
  return `${org}/${repo}/stylesheet.json`;
}

export async function fetchDaAccessToken() {
  const tokenResponse = await fetch(DA_TOKEN_URL);
  if (!tokenResponse.ok) {
    throw new Error(`Failed to fetch da-access-token: ${tokenResponse.status}`);
  }
  const tokenData = await tokenResponse.json();
  const token = tokenData.access_token || tokenData.token || '';
  if (!token) {
    throw new Error('da-access-token response missing token');
  }
  return token;
}

/**
 * Fetches stylesheet.json from DA Source API.
 * @returns {Promise<{ ':type'?: string, data?: Array<{ key: string, value: string }> }>}
 */
export async function fetchStylesheetJson() {
  const daAccessToken = await fetchDaAccessToken();
  const { org, repo } = parseDaSiteContext();
  const path = getStylesheetSourcePath(org, repo);
  const stylesheetUrl = `https://admin.da.live/source/${path}`;
  const stylesheetResponse = await fetch(stylesheetUrl, {
    headers: {
      Authorization: `Bearer ${daAccessToken}`,
    },
  });
  if (!stylesheetResponse.ok) {
    throw new Error(`Failed to fetch stylesheet.json: ${stylesheetResponse.status}`);
  }
  return stylesheetResponse.json();
}

/**
 * Writes stylesheet.json to DA (create/overwrite) via Source API multipart POST.
 * @param {object} sheetObject Full sheet document including :type and data[]
 */
export async function postStylesheetJson(sheetObject) {
  const daAccessToken = await fetchDaAccessToken();
  const { org, repo } = parseDaSiteContext();
  const path = getStylesheetSourcePath(org, repo);
  const url = `https://admin.da.live/source/${path}`;
  const formData = new FormData();
  const body = JSON.stringify(sheetObject, null, 2);
  const blob = new Blob([body], { type: 'application/json' });
  formData.append('data', blob, 'stylesheet.json');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${daAccessToken}`,
    },
    body: formData,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Update stylesheet failed: ${res.status} ${errText}`);
  }
  return res.json().catch(() => ({}));
}

const allowedThemeKeys = new Set(THEME_STYLESHEET_KEYS);

function themeRowsFromSheet(stylesheetData) {
  if (!Array.isArray(stylesheetData?.data)) return [];
  return stylesheetData.data.filter(
    (item) => item?.key && allowedThemeKeys.has(item.key) && item.value != null && String(item.value).trim() !== '',
  );
}

/**
 * Injects a style element in document.head with :root custom properties from the DA sheet.
 * @param {{ data?: Array<{ key: string, value: string }> }} stylesheetData
 */
export function injectThemeStyleTag(stylesheetData) {
  const rows = themeRowsFromSheet(stylesheetData);
  if (rows.length === 0) return;
  const rootVars = rows.map((item) => `  --${item.key}: ${item.value};`).join('\n');
  const css = `:root {\n${rootVars}\n}`;
  let el = document.head.querySelector(`style[${THEME_STYLE_ATTR}]`);
  if (!el) {
    el = document.createElement('style');
    el.setAttribute(THEME_STYLE_ATTR, 'true');
    document.head.appendChild(el);
  }
  el.textContent = css;

  // Save the theme data on localStorage as well
  try {
    localStorage.setItem('theme-stylesheet-data', JSON.stringify(stylesheetData));
  } catch (e) {
    // Ignore write errors (e.g. quota exceeded)
    // Could add some logging here if needed
  }
}

/**
 * Sets page-metadata meta tags from the stylesheet so Universal Editor page properties show prefilled values.
 * Only updates tags whose content is missing or blank so authored page metadata is not overwritten.
 * @param {{ data?: Array<{ key: string, value: string }> }} stylesheetData
 */
export function prefillPageMetadataFromStylesheet(stylesheetData) {
  const rows = themeRowsFromSheet(stylesheetData);
  rows.forEach(({ key, value }) => {
    const content = String(value).trim();
    const metas = document.head.querySelectorAll(`meta[name="${key}"]`);
    if (metas.length === 0) {
      const meta = document.createElement('meta');
      meta.setAttribute('name', key);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
      return;
    }
    metas.forEach((meta) => {
      const cur = (meta.getAttribute('content') ?? '').trim();
      if (!cur) meta.setAttribute('content', content);
    });
  });
}

async function applyTheme() {
  let stylesheetData = {};
  try {
    stylesheetData = await fetchStylesheetJson();
  } catch (err) {
    console.error('Error fetching remote stylesheet.json:', err);
  }
  injectThemeStyleTag(stylesheetData);
  
  
  setTimeout(() => {
    prefillPageMetadataFromStylesheet(stylesheetData);
  }, 2000);
  
}

applyTheme();
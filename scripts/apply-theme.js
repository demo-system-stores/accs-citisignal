/**
 * Theme tokens stored in DA `stylesheet.json` (keys become `--{key}` on :root).
 * Edited in authoring via the customise-theme block (not page metadata).
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

/**
 * Merges theme token rows into a full stylesheet for the DA Source API.
 * Non-theme rows are kept. Theme keys use non-empty entries from themeValues.
 * @param {object} currentSheet Full stylesheet JSON (may be empty).
 * @param {Record<string, string>} themeValues Theme key to value (blank omits).
 * @returns {object} Sheet for {@link postStylesheetJson}.
 */
export function mergeThemeIntoStylesheet(currentSheet, themeValues) {
  const data = Array.isArray(currentSheet?.data) ? [...currentSheet.data] : [];
  const rest = data.filter((item) => item?.key && !allowedThemeKeys.has(item.key));
  const newThemeRows = THEME_STYLESHEET_KEYS.filter((key) => {
    const v = themeValues[key];
    return v != null && String(v).trim() !== '';
  }).map((key) => ({ key, value: String(themeValues[key]).trim() }));
  return {
    ...currentSheet,
    data: [...rest, ...newThemeRows],
  };
}

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
 * Element with data-aue-* matching page-metadata meta instrumentation for UE.
 * Falls back to {@link document.documentElement} if none.
 * @returns {Element}
 */
function getPageMetadataUeTemplate() {
  const textMeta = document.head.querySelector('meta[data-aue-type="text"][data-aue-prop]');
  if (textMeta) return textMeta;
  const anyMeta = document.head.querySelector('meta[data-aue-prop]');
  if (anyMeta && anyMeta.getAttribute('data-aue-type') !== 'media') return anyMeta;
  return document.documentElement;
}

/**
 * Copies Universal Editor instrumentation onto a theme meta so the page-metadata panel binds to it.
 * @param {HTMLMetaElement} meta
 * @param {string} fieldKey model field name (meta name)
 */
export function applyPageMetadataUeInstrumentation(meta, fieldKey) {
  const template = getPageMetadataUeTemplate();
  if (template.tagName === 'META') {
    [...template.attributes].forEach(({ name, value }) => {
      if (!name.startsWith('data-aue-') || name === 'data-aue-prop') return;
      meta.setAttribute(name, value);
    });
  } else {
    const resource = template.getAttribute('data-aue-resource');
    if (resource) meta.setAttribute('data-aue-resource', resource);
    const model = template.getAttribute('data-aue-model');
    if (model) meta.setAttribute('data-aue-model', model);
  }
  meta.setAttribute('data-aue-type', 'text');
  meta.setAttribute('data-aue-prop', fieldKey);
}

/**
 * Sets page-metadata metas from the stylesheet so UE page properties are prefilled.
 * Metas need data-aue-prop / data-aue-type (and usually data-aue-resource).
 * Only fills content when missing or blank so authored metadata is kept.
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
      applyPageMetadataUeInstrumentation(meta, key);
      document.head.appendChild(meta);
      return;
    }
    metas.forEach((meta) => {
      const cur = (meta.getAttribute('content') ?? '').trim();
      if (!cur) meta.setAttribute('content', content);
      if (!meta.hasAttribute('data-aue-prop')) {
        applyPageMetadataUeInstrumentation(meta, key);
      }
    });
  });
}

/** Latest sheet payload for re-running metadata sync after UE attaches instrumentation. */
let lastStylesheetDataForMetadata = {};

async function applyTheme() {
  try {
    lastStylesheetDataForMetadata = await fetchStylesheetJson();
  } catch (err) {
    console.error('Error fetching remote stylesheet.json:', err);
    lastStylesheetDataForMetadata = {};
  }
  injectThemeStyleTag(lastStylesheetDataForMetadata);
  prefillPageMetadataFromStylesheet(lastStylesheetDataForMetadata);
}

document.addEventListener(
  'aue:initialized',
  () => {
    prefillPageMetadataFromStylesheet(lastStylesheetDataForMetadata);
    requestAnimationFrame(() => {
      prefillPageMetadataFromStylesheet(lastStylesheetDataForMetadata);
    });
  },
  { passive: true },
);

applyTheme();

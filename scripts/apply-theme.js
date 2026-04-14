/**
 * Theme tokens stored in DA `stylesheet.json` (keys become `--{key}` on :root).
 * Edited in authoring via the customise-theme block (not page metadata).
 */
// eslint-disable-next-line import/no-cycle -- aem does not import apply-theme
import { toClassName } from './aem.js';

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

function themeValueMapFromSheet(stylesheetData) {
  const map = {};
  themeRowsFromSheet(stylesheetData).forEach(({ key, value }) => {
    map[key] = String(value).trim();
  });
  return map;
}

/**
 * Sets both the live value and the HTML value attribute so Universal Editor
 * block properties and the in-page inputs stay aligned.
 * @param {HTMLInputElement} input
 * @param {string} val
 */
export function setUeTextInputValue(input, val) {
  const s = val == null ? '' : String(val);
  input.value = s;
  if (s) input.setAttribute('value', s);
  else input.removeAttribute('value');
}

function syncDecoratedCustomiseThemeBlock(block, valueByKey) {
  block.querySelectorAll('input.customise-theme-text[data-aue-prop]').forEach((input) => {
    const key = input.getAttribute('data-aue-prop');
    if (!key || !allowedThemeKeys.has(key)) return;
    const val = valueByKey[key];
    if (val == null || val === '') return;
    setUeTextInputValue(input, val);
    const row = input.closest('.customise-theme-row');
    const color = row?.querySelector('input.customise-theme-color');
    if (color) {
      const hex = val.startsWith('#') ? val : `#${val}`;
      if (/^#[0-9a-fA-F]{6}$/.test(hex)) color.value = hex.toLowerCase();
    }
  });
}

function syncAuthoringTableCustomiseThemeBlock(block, valueByKey) {
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cols = [...row.children];
    if (cols.length < 2) return;
    const key = toClassName(cols[0].textContent);
    if (!allowedThemeKeys.has(key)) return;
    const val = valueByKey[key];
    if (val == null || val === '') return;
    const valCell = cols[1];
    const target = valCell.matches('[data-aue-prop]')
      ? valCell
      : valCell.querySelector('[data-aue-prop]') || valCell.querySelector('p') || valCell;
    target.textContent = val;
  });
}

/** Remove legacy head metas from the old page-metadata theme prefill. */
function removeLegacyThemeMetaTags() {
  THEME_STYLESHEET_KEYS.forEach((key) => {
    document.head.querySelectorAll(`meta[name="${key}"]`).forEach((meta) => meta.remove());
  });
}

/**
 * Pushes stylesheet theme values into customise-theme blocks for UE block properties.
 * Targets authored table cells or decorated inputs (data-aue-prop).
 * @param {{ data?: Array<{ key: string, value: string }> }} stylesheetData
 */
export function syncThemeSheetToCustomiseThemeBlocks(stylesheetData) {
  const map = themeValueMapFromSheet(stylesheetData);
  if (Object.keys(map).length === 0) return;
  document.querySelectorAll('.customise-theme').forEach((blockEl) => {
    if (blockEl.querySelector('input.customise-theme-text[data-aue-prop]')) {
      syncDecoratedCustomiseThemeBlock(blockEl, map);
    } else {
      syncAuthoringTableCustomiseThemeBlock(blockEl, map);
    }
  });
}

/** Latest sheet payload for re-running customise-theme sync after UE loads. */
let lastStylesheetSnapshot = {};

/** Keep snapshot in sync after customise-theme save (avoids stale re-sync from aue events). */
export function setLastStylesheetSnapshotForTheme(sheet) {
  lastStylesheetSnapshot = sheet && typeof sheet === 'object' ? sheet : {};
}

async function applyTheme() {
  try {
    lastStylesheetSnapshot = await fetchStylesheetJson();
  } catch (err) {
    console.error('Error fetching remote stylesheet.json:', err);
    lastStylesheetSnapshot = {};
  }
  removeLegacyThemeMetaTags();
  injectThemeStyleTag(lastStylesheetSnapshot);
  syncThemeSheetToCustomiseThemeBlocks(lastStylesheetSnapshot);
}

document.addEventListener(
  'aue:initialized',
  () => {
    removeLegacyThemeMetaTags();
    syncThemeSheetToCustomiseThemeBlocks(lastStylesheetSnapshot);
    requestAnimationFrame(() => {
      syncThemeSheetToCustomiseThemeBlocks(lastStylesheetSnapshot);
    });
  },
  { passive: true },
);

applyTheme();

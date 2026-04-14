import { readBlockConfig } from '../../scripts/aem.js';
import {
  THEME_STYLESHEET_KEYS,
  fetchStylesheetJson,
  postStylesheetJson,
  injectThemeStyleTag,
  prefillPageMetadataFromStylesheet,
  mergeThemeIntoStylesheet,
} from '../../scripts/apply-theme.js';

const THEME_LABELS = {
  'theme-primary': 'Theme primary',
  'theme-secondary': 'Theme secondary',
  'primary-text': 'Primary text',
  'secondary-text': 'Secondary text',
  'menu-background': 'Menu background',
  'menu-text-color': 'Menu text color',
  fonts: 'Fonts',
};

const COLOR_KEYS = new Set([
  'theme-primary',
  'theme-secondary',
  'primary-text',
  'secondary-text',
  'menu-background',
  'menu-text-color',
]);

function normalizeHexInput(value) {
  const s = String(value).trim();
  if (!s) return '';
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s.toLowerCase()}`;
  return s;
}

function sheetValueMap(stylesheetData) {
  const map = {};
  if (!Array.isArray(stylesheetData?.data)) return map;
  stylesheetData.data.forEach((row) => {
    if (row?.key && THEME_STYLESHEET_KEYS.includes(row.key)) {
      map[row.key] = String(row.value ?? '').trim();
    }
  });
  return map;
}

export default async function decorate(block) {
  const initialFromBlock = readBlockConfig(block);
  const root = document.createElement('div');
  root.className = 'customise-theme-root';

  const fields = {};
  THEME_STYLESHEET_KEYS.forEach((key) => {
    const row = document.createElement('div');
    row.className = 'customise-theme-row';

    const label = document.createElement('label');
    label.className = 'customise-theme-label';
    label.htmlFor = `customise-theme-${key}`;
    label.textContent = THEME_LABELS[key] || key;

    const inputWrap = document.createElement('div');
    inputWrap.className = 'customise-theme-inputs';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.id = `customise-theme-${key}`;
    textInput.name = key;
    textInput.className = 'customise-theme-text';
    textInput.placeholder = COLOR_KEYS.has(key) ? '#000000' : '';
    textInput.autocomplete = 'off';

    if (COLOR_KEYS.has(key)) {
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'customise-theme-color';
      colorInput.setAttribute('aria-label', `${THEME_LABELS[key] || key} (picker)`);

      const syncColorToText = () => {
        textInput.value = colorInput.value;
      };
      const syncTextToColor = () => {
        const hex = normalizeHexInput(textInput.value);
        if (/^#[0-9a-f]{6}$/.test(hex)) colorInput.value = hex;
      };

      colorInput.addEventListener('input', syncColorToText);
      textInput.addEventListener('input', syncTextToColor);

      inputWrap.append(colorInput, textInput);
      fields[key] = { textInput, colorInput };
    } else {
      inputWrap.append(textInput);
      fields[key] = { textInput, colorInput: null };
    }

    row.append(label, inputWrap);
    root.append(row);
  });

  const actions = document.createElement('div');
  actions.className = 'customise-theme-actions';
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'button';
  saveBtn.textContent = 'Save theme';
  const status = document.createElement('p');
  status.className = 'customise-theme-status';
  status.setAttribute('role', 'status');
  actions.append(saveBtn, status);
  root.append(actions);

  function setValues(map) {
    THEME_STYLESHEET_KEYS.forEach((key) => {
      const raw = map[key] ?? initialFromBlock[key] ?? '';
      const val = String(raw).trim();
      const { textInput, colorInput } = fields[key];
      textInput.value = val;
      if (colorInput && /^#[0-9a-fA-F]{6}$/.test(normalizeHexInput(val))) {
        colorInput.value = normalizeHexInput(val);
      } else if (colorInput && !val) {
        colorInput.value = '#000000';
      }
    });
  }

  function collectThemeValues() {
    const themeValues = {};
    THEME_STYLESHEET_KEYS.forEach((key) => {
      const { textInput } = fields[key];
      let v = String(textInput.value).trim();
      if (COLOR_KEYS.has(key)) v = normalizeHexInput(v);
      themeValues[key] = v;
    });
    return themeValues;
  }

  saveBtn.addEventListener('click', async () => {
    status.textContent = '';
    saveBtn.disabled = true;
    try {
      let current = {};
      try {
        current = await fetchStylesheetJson();
      } catch {
        current = {};
      }
      const merged = mergeThemeIntoStylesheet(current, collectThemeValues());
      await postStylesheetJson(merged);
      injectThemeStyleTag(merged);
      prefillPageMetadataFromStylesheet(merged);
      status.textContent = 'Theme saved.';
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : 'Save failed.';
    } finally {
      saveBtn.disabled = false;
    }
  });

  block.textContent = '';
  block.append(root);

  try {
    const sheet = await fetchStylesheetJson();
    setValues(sheetValueMap(sheet));
  } catch {
    setValues({});
  }
}

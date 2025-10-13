# Universal Editor Cache-Busting

## Problem

When authors edit fragments in Universal Editor (UE) and publish changes, they don't see updates immediately on pages that embed those fragments. This happens because:

1. Author edits and publishes fragment at `/fragments/header`
2. Fragment content is cached by the browser
3. Author opens a page that embeds the fragment
4. Page loads the **cached** version via `loadFragment()`
5. Author sees stale content, creating confusion

This caching issue is **specific to authoring in Universal Editor** - production sites should use normal browser caching for performance.

## Solution

Two utilities in `/scripts/utils.js` provide automatic cache-busting in UE:

### 1. `isUniversalEditor()`
Detects if running in UE or localhost context:

```javascript
export function isUniversalEditor() {
  return window.location.hostname.includes('.ue.da.live')
    || window.location.hostname === 'localhost';
}
```

### 2. `fetchWithCacheBusting()`
Wrapper around `fetch()` that bypasses cache in UE:

```javascript
export async function fetchWithCacheBusting(resource, options = {}) {
  const fetchOptions = isUniversalEditor()
    ? { ...options, cache: 'reload' }
    : options;

  return fetch(resource, fetchOptions);
}
```

**How it works:**
- In UE/localhost: Uses `cache: 'reload'` to bypass HTTP cache
- In production: Uses standard browser caching for performance

## Automatic Coverage

**All fragments automatically use cache-busting** via the centralized `loadFragment()` function:

```javascript
// blocks/fragment/fragment.js
import { fetchWithCacheBusting } from '../../scripts/utils.js';

export async function loadFragment(path) {
  if (path && path.startsWith('/')) {
    const root = getRootPath().replace(/\/$/, '');
    const url = `${root}${path}.plain.html`;

    // Automatic cache-busting for all fragments
    const resp = await fetchWithCacheBusting(url);
    // ...
  }
}
```

Since every fragment uses this function, **no developer action is needed** - fragments work correctly in UE out of the box.

## Developer Usage

### For Custom Blocks

If you create a custom block that fetches `.plain.html` content, use the utility:

```javascript
// blocks/custom-content/custom-content.js
import { fetchWithCacheBusting } from '../../scripts/aem.js';

export default async function decorate(block) {
  const contentPath = block.textContent.trim();

  // Opt-in to cache-busting for UE authoring
  const resp = await fetchWithCacheBusting(`${contentPath}.plain.html`);
  block.innerHTML = await resp.text();
}
```

### For UE Detection Only

Use `isUniversalEditor()` to conditionally add authoring affordances:

```javascript
import { isUniversalEditor } from '../../scripts/aem.js';

export default async function decorate(block) {
  if (isUniversalEditor()) {
    // Add visual indicators for authors
    block.setAttribute('data-editor-mode', 'true');
    block.classList.add('ue-editing');
  }
}
```

## Benefits

- **Automatic:** Fragments work correctly in UE without developer intervention
- **Opt-in:** Custom blocks choose to use cache-busting
- **Performance:** No impact on production (standard caching preserved)
- **Maintainable:** Single source of truth for UE detection
- **Reusable:** Utilities available via `aem.js` exports

## Technical Details

**Why `cache: 'reload'`?**
- Forces browser to validate cached responses with origin server
- Ensures authors always see latest published content
- More reliable than query parameters (which can be cached)

**Why include localhost?**
- Developers testing fragments locally need fresh content
- Consistent behavior between local and UE environments

**Export from aem.js:**
```javascript
// scripts/aem.js
export { isUniversalEditor, fetchWithCacheBusting } from './utils.js';
```

This makes utilities easily discoverable and follows EDS patterns for shared functionality.
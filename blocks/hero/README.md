# Hero Block

## Overview

The Hero block is a simple promotional banner used to highlight a key message, campaign, or brand introduction at the top of a page. It is designed around a large image and a headline, giving the page an immediate visual focus without requiring custom logic.

## Integration

### Block Configuration

The block is defined in `_hero.json` and exposes the following authoring fields:

- `image` - Main hero image asset
- `alt` - Alternative text for the image
- `text` - Primary hero headline text

The model is configured as a lightweight AEM block using a `reference` field for the image and a text field for the heading.

### URL Parameters

No URL parameters are read by the Hero block.

### Local Storage

No local storage keys are used by this block.

### Events

No custom event listeners or emitters are implemented by this block. The current implementation is primarily static content rendering.

### Metadata

No metadata tags are consumed by this block.

## Behavior Patterns

### Layout

- Displays a prominent image and headline together
- Intended for use near the top of landing pages or marketing sections
- Keeps the content visually simple and high impact

### Content Structure

The Hero block expects a structure similar to:

```html
<div class="hero">
  <picture>
    <img src="..." alt="..." />
  </picture>
  <h1>Hero headline text</h1>
</div>
```

### Responsive Behavior

The formatting and spacing are controlled through `hero.css`. The block is intended to stay readable across desktop and mobile widths while preserving the focal image and headline composition.

### Accessibility

- Image alt text should be meaningful and descriptive
- Heading text should be clear and concise
- Text contrast should remain legible against the background image

## Files

- `hero.js` - currently empty placeholder for block logic
- `hero.css` - styling for image layout and hero text presentation
- `_hero.json` - authoring model and field definitions

## Example Content

```markdown
Image: /content/dam/site/hero-banner.jpg
Alt: Summer collection campaign image
Text: Shop the latest arrivals
```

## Notes

This block is a basic content-driven hero component and does not currently include interactive behavior, dynamic data loading, or event-driven functionality. For additional behavior, the block may be extended in `hero.js` and styled in `hero.css`.


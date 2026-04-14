# Product Teaser Block

## Overview

The Product Teaser block showcases product highlights or compact item previews in an attractive, responsive layout. Each teaser may feature an image, title, description, and optional link or action, making this block ideal for featured products, services, or any collection of items meant to draw attention.

## Integration

### Block Configuration

No configuration settings are required. Content and layout are provided directly in the block's row/column structure.

### Block Structure

Each row in the block represents a product teaser, typically arranged as:
- First column: Product image (optional) – styled as `product-teaser-image`
- Second column: Main content area including product name, summary, and optional link or call to action – styled as `product-teaser-body`

Example authoring structure:
```
| Image             | Content                                     |
|-------------------|---------------------------------------------|
| ![Product 1](img1.jpg) | <h3>Item Name</h3><p>Short description.</p><a href="/details">Learn More</a> |
| ![Product 2](img2.jpg) | <h3>Second Item</h3><p>Another summary.</p> |
```

<!-- ### URL Parameters

No URL parameters modify this block. -->

<!-- ### Local Storage

This block does not utilize localStorage. -->

<!-- ### Events

This block does not emit or handle bespoke events. -->

## Behavior Patterns

### Layout Behavior

- **Responsive Cards**: Teasers are displayed in a responsive card-like grid, adapting the number of columns to screen width.
- **Consistent Card Size**: Each teaser card is sized evenly for balanced appearance.
- **Image Optimization**: Images use a default width or are covered responsively for performance.

### Visual Structure

- **Product Image**: Shown in a fixed 4:3 ratio with object-fit cover if present.
- **Body Content**: Padded section containing name, brief content, and calls to action or links.
- **Spacing & Gaps**: Cards feature medium spacing using `var(--spacing-medium)` for separation.
- **Borders & Background**: Each card has a subtle border and neutral background for emphasis.

### User Interaction Flows

1. **Interactive Areas**: Links and calls to action within the teaser card content remain clickable and accessible.
2. **Responsive Design**: Grid shifts number of columns based on viewport size for best usability on mobile and desktop.
3. **Image Efficiencies**: Images are lazy-loaded and optimized to speed up page loads.
4. **Keyboard Accessibility**: All content and interactive elements are accessible via keyboard navigation.

### Error Handling

- **Missing Images**: Teasers without images still render with just content.
- **Empty Rows**: Rows with no substantial data are handled gracefully and do not break layout.
- **Unstructured Content**: Teasers with unexpected or malformed content do not disrupt the visual grid.

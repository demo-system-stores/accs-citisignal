# Footer Block

## Overview

The Footer block provides a flexible area at the bottom of the page to display site-wide information, navigation links, contact details, or other custom content. Its structure supports one or more columns, and layout adjusts for desktop and mobile screens.

## Integration

### Block Configuration

This block does not require custom configuration parameters. Content and layout are authored directly in the block structure.

### Block Structure

Each row in the block becomes a horizontal group within the footer, and each cell can include text, links, icons, or other markup. Typically, columns are used for site links, contact info, copyright, or social media.

Example authoring structure:
```
| Column 1                       | Column 2                 | Column 3        |
|--------------------------------|--------------------------|-----------------|
| <h3>Contact</h3><p>info@site</p> | <h3>Links</h3><ul><li>...</li></ul> | <h3>Follow</h3><a>...</a> |
```

<!-- ### URL Parameters

No URL parameters affect this block's content or layout. -->

<!-- ### Local Storage

No localStorage keys are used by this block. -->

<!-- ### Events

This block does not emit or listen to any custom events. -->

## Behavior Patterns

### Layout Behavior

- **Responsive Columns**: Columns are displayed side-by-side on larger screens and stack vertically on smaller screens
- **Flexible Content**: Each cell supports text, HTML, icons, or links
- **Spacing and Alignment**: Footer elements are distributed evenly with consistent spacing, defaults to `var(--spacing-medium)`

### Visual Structure

- **Column Headings**: Optional headings in bold or larger text
- **Links**: Styled consistently with site navigation and remain easily accessible
- **Background/Contrast**: Footer background is distinct, typically uses --menu-background and --menu-text-color theme variables

### User Interaction Flows

1. **Navigation Access**: Footer links remain clickable and accessible, with hover/focus styles
2. **Responsive Stacking**: Columns stack for readability on smaller devices
3. **Accessible Markup**: Semantic HTML for headings, lists, and links ensures screen reader support

### Error Handling

- **Empty Cells**: If a column or row is empty, spacing is preserved and the layout remains intact
- **Malformed Content**: Block handles unexpected or incomplete markup gracefully without layout breakage

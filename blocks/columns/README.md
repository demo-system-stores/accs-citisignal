# Columns Block

## Overview

The Columns block presents each row as a flexible set of columns, ideal for layouts such as feature comparisons, team listings, info panels, or other tabular content. Each cell can include text, HTML, media, or links, making this block highly adaptable for side-by-side content display in a visually organized manner.

## Integration

### Block Configuration

This block does not require configuration parameters. Content and layout are defined directly in the block's columns and rows.

### Block Structure

Each row in the block is rendered as a horizontal group of columns:
- Each cell becomes a column, ordered left to right.
- The visual appearance (such as equal width, alignment, or special styling) can be controlled by CSS or design tokens.

Example authoring structure:
```
| Column 1            | Column 2            | Column 3         |
|---------------------|---------------------|------------------|
| <h3>Header A</h3>   | <p>Text A</p>       | ![imgA](imgA.jpg)|
| <h3>Header B</h3>   | <p>Text B</p>       | ![imgB](imgB.jpg)|
```

<!-- ### URL Parameters

No URL parameters directly affect this block's layout. -->

<!-- ### Local Storage

This block does not persist data in localStorage. -->

<!-- ### Events

This block does not emit or listen to any custom events. -->

## Behavior Patterns

### Layout Behavior

- **Responsive Columns**: Columns adjust their width based on available screen space and CSS settings.
- **Flexible Content**: Each cell may contain images, formatted text, or inline HTML.
- **Equal or Manual Sizing**: Columns can be set to equal width or use custom sizing classes.
- **Overflow Handling**: Content that exceeds column width wraps or scrolls as determined by CSS.

### Visual Structure

- **Column Alignment**: Cells are vertically aligned within each row.
- **Gaps and Spacing**: Consistent horizontal gaps between columns, defined by `var(--spacing-medium)` or similar design tokens.
- **Dividers**: Optional vertical dividers between columns for enhanced readability.
- **Borders**: Optional row or column borders are theme-adaptive.

### User Interaction Flows

1. **Content Display**: Each row is rendered as a horizontal group of columns.
2. **Responsiveness**: On smaller screens, columns may stack vertically for a mobile-friendly view.
3. **Links and Media**: Any links or interactive elements remain fully functional within columns.
4. **Highlighting**: Optional highlight styles (e.g., headers bolded) can be applied with custom classes.

### Error Handling

- **Empty Cells**: Empty cells are rendered as blank columns with spacing preserved.
- **Row Consistency**: Rows with missing columns will still display, keeping consistent alignment.
- **Graceful Degradation**: The block renders safely even with incomplete or malformed data.

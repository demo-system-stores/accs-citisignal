# Accordion Block

## Overview

The Accordion block displays content in a vertically stacked list of items, where each item can be expanded or collapsed to show or hide its body content. This interaction pattern is ideal for FAQs, documentation, or any content where space-saving, progressive disclosure is desired.

## Integration

### Block Configuration

This block does not require configuration parameters. All content and headings are defined directly within the block structure.

### Block Structure

Each row in the block becomes an accordion item:
- First column: Accordion Header - rendered as the clickable trigger
- Second column: Accordion Body - collapsible content shown/hidden by user interaction

Example authoring structure:
```
| Header            | Content                        |
|-------------------|-------------------------------|
| What is your name?| <p>My name is Accordion.</p>  |
| How does it work? | <p>Click to expand content.</p>|
```

<!-- ### URL Parameters

No URL parameters affect this block's behavior. -->

<!-- ### Local Storage

No localStorage keys are used by this block. -->

<!-- ### Events

This block does not emit or listen to any custom events. -->

## Behavior Patterns

### Layout Behavior

- **Stacked List**: Accordion items are rendered vertically, occupying the full block width
- **Collapsible Content**: Only one item is expanded at a time by default (configurable)
- **Accessible Interaction**: Keyboard and screen-reader accessible triggers (ARIA attributes)

### Visual Structure

- **Accordion Header**: Bold or prominent clickable area for each item
- **Accordion Body**: Content area that expands or collapses with smooth animation
- **Dividers**: Optional separators between items for visual clarity

### User Interaction Flows

1. **Toggle Content**: Clicking a header toggles display of the corresponding content body
2. **Collapse Others**: Optionally, expanding one item can collapse any others that are open
3. **Keyboard Navigation**: Users can navigate via Tab and open/close with Enter/Space keys

### Error Handling

- **Empty Headers**: If a header cell is blank, item is not rendered as an accordion row
- **Empty Content**: Items with no content body will still display a header, but body area will be empty
- **Graceful Degradation**: Block handles empty or malformed rows without breaking layout or interaction

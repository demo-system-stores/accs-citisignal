# Hero Block

## Overview

The Hero block is designed to highlight a key message, call to action, or visual at the top of a page. It supports prominent headlines, optional images or illustrations, and customizable background styles. Use this block to capture user attention and set the tone for your page or section.

## Integration

### Block Configuration

No special configuration is required. All content is authored directly in the block fields.

### Block Structure

The hero block typically expects the following row structure:
- First column: Headline (`<h1>`, `<h2>`, or similar for accessibility)
- Second column (optional): Supporting text, description, or call-to-action button
- Third column (optional): Image, graphic, or media

Example authoring structure:
```
| Headline                          | Description                 | Image Path         |
|------------------------------------|-----------------------------|--------------------|
| <h1>Welcome to City Signal</h1>    | <p>Shaping urban mobility.</p><a href="/explore">Explore</a> | /img/hero-image.jpg |
```

<!-- ### URL Parameters

No URL parameters directly affect this block. -->

<!-- ### Local Storage

This block does not use localStorage. -->

<!-- ### Events

This block does not emit or listen to custom events. -->

## Behavior Patterns

### Layout Behavior

- **Full-Width Section**: By default, the hero stretches edge-to-edge at the top of the page.
- **Responsive Arrangement**: Headline, description, and image stack vertically on mobile, horizontally on desktop.
- **Content Modularity**: Each cell can include HTML, images, or links.
- **Prominence**: Largest font sizing, bold heading, and generous vertical spacing set apart from regular content.

### Visual Structure

- **Headline**: Uses bold, large font-size for maximum attention.
- **Supporting Text**: Optional subtitle or description with standard body font size.
- **Image or Illustration**: If provided, image displays at the right or above text, maintaining aspect ratio and covering available space.
- **Background**: May use themed background color or gradient, optionally with overlay image or pattern.
- **Spacing**: Consistent `var(--spacing-large)` padding and gutters.

### User Interaction Flows

1. **Primary Call to Action**: Button or link prompts user to next step (e.g., "Learn More", "Contact", "Get Started").
2. **Responsive Experience**: On smaller devices, content and images stack for readability and impact.
3. **Accessible Heading**: Ensures heading hierarchy for screen readers (should use `<h1>` at top of page).

### Error Handling

- **Missing Columns**: If image or description cell is empty, only present content is shown, layout gracefully adapts.
- **Malformed Markup**: Displays raw HTML as-is with fallbacks for broken tags (sanitization is recommended at data entry layer).
- **Empty Rows**: Block renders nothing or a visually minimal placeholder if all columns are empty.

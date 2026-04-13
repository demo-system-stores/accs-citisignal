# Customise Theme Block

The **Customise Theme** block enables global changes to your site's theme colors, fonts, and presentation. Add this block to provide site editors with controls for adjusting the default look and feel to suit your branding or campaign needs.

## Features

- Easily change theme colors (primary, secondary, text, backgrounds) sitewide.
- Switch font preferences with a simple input.
- Allows for fast, user-friendly overrides of essential brand variables.
- Fields are mapped to CSS variables and will update all theme-aware components automatically.

## Structure

This block hooks into the theme variables for your project. Configuration is usually managed through model JSON files for the page or block, typically with fields like:

```json
{
  "theme-primary": "#004AB9",
  "theme-secondary": "#FFD21E",
  "primary-text": "#222",
  "secondary-text": "#fff",
  "menu-background": "#ffffff",
  "menu-text-color": "#222",
  "fonts": "Inter, Arial, sans-serif"
}
```

## Editing

- **theme-primary**: Main brand color.
- **theme-secondary**: Accent or secondary brand color.
- **primary-text / secondary-text**: Main body and additional context text colors.
- **menu-background / menu-text-color**: Adjust navigation colors.
- **fonts**: Specify one or more preferred font families.

These can be set per-page or globally, depending on your site/editor config.

## Styling

- Theme variables are exposed using CSS custom properties.
- All theme-aware blocks reference these variables.
- Style can be further tuned via your main stylesheet or per-block.

## Usage

1. Add the "Customise Theme" block to your desired section or the page.
2. Fill in your primary, secondary, and text color values, and choose a font.
3. All components that use theme variables will update to reflect your selections instantly.

## Example

```markdown
| Primary Color | Secondary Color | Text Color | Menu Background | Font(s)                  |
|---------------|----------------|------------|-----------------|--------------------------|
| #004AB9       | #FFD21E        | #222       | #ffffff         | Inter, Arial, sans-serif |
```

You can also include additional fields for fine-tuned adjustments as required by your design.

## Notes

- Color values should be valid CSS hex or rgba.
- Font choices cascade; include web-safe fallbacks.
- Use this block to keep branding consistent across all content without direct CSS edits.

For more technical details, see the block's JS and JSON schema files.

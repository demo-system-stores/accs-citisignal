# Customise Theme Block

The **Customise Theme** block lets site editors easily update brand appearance by modifying theme colors, fonts, and key presentation properties directly from the editor UI. Use this block to help keep your site's visual identity consistent and up to date without editing code.

## What It Does

- Lets editors set the site’s primary and secondary colors, along with main and additional text colors.
- Provides inputs to quickly change font families sitewide.
- Exposes other common variables, like navigation backgrounds and menu text, for fast adjustment.
- Synchronizes these settings across all styled components by updating CSS variables in real time.

## Typical Configuration

This block works by mapping user inputs to standard theme variables, which are referenced throughout your site’s CSS. You can configure it via the related page or block JSON, such as:

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

## Editable Fields

- **theme-primary**: Main brand color (backgrounds, accents, buttons)
- **theme-secondary**: Support/accent color
- **primary-text**, **secondary-text**: General and alternate font colors
- **menu-background**, **menu-text-color**: Main navigation appearance
- **fonts**: Set preferred font-family stack (include system or web-safe fonts as fallbacks)

These values can be defined either globally (affecting the entire site) or per page/section, depending on your setup.

## How It Works

- Inputs update CSS variables (custom properties) such as `--theme-primary` and `--fonts`.
- All theme-aware components reference these CSS variables, so changes apply instantly across the UI.
- Additional custom adjustments can be layered in your site stylesheet or specific block CSS.

## How To Use

1. Add the "Customise Theme" block to the page or relevant section.
2. Fill in branding colors, text colors, background and font details.
3. The site updates as soon as you save or publish changes—no CSS edits required.

### Example Table

| Primary Color | Secondary Color | Text Color | Menu Background | Font(s)                  |
|---------------|----------------|------------|-----------------|--------------------------|
| #004AB9       | #FFD21E        | #222       | #ffffff         | Inter, Arial, sans-serif |

You can add new fields if you need finer control over other CSS variables.

## Important Notes

- All color values should be in standard CSS formats (hex, rgb(a), etc).
- List fallback fonts for the best cross-browser compatibility.
- Use this block to enforce brand consistency, avoid hard-coding colors or fonts in your CSS.

For technical implementation details, refer to the block’s JavaScript and JSON schema files.

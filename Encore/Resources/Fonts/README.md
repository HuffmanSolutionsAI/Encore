# Fonts

Encore's type system uses two SIL Open Font License families. The font files are **not committed**
(see `.gitignore`) — drop them into this folder before building so the brand type renders.

Required files (filenames must match `Resources/Info.plist` → `UIAppFonts`):

| File | Family | Use |
|------|--------|-----|
| `Fraunces-SemiBold.ttf` | Fraunces 9pt SemiBold (600) | Display — wordmark, headings, titles, big scores |
| `Inter-Regular.ttf` | Inter 400 | Body text |
| `Inter-Medium.ttf` | Inter 500 | Labels, captions |
| `Inter-SemiBold.ttf` | Inter 600 | Buttons, emphasis |
| `Inter-Bold.ttf` | Inter 700 | Strong emphasis |

Download:

- **Fraunces** — https://github.com/undercasetype/Fraunces (use the `Fraunces 9pt SemiBold` static
  instance, or export it from the variable font).
- **Inter** — https://github.com/rsms/inter (use the static `.ttf` files).

After adding the files, add them to the `Encore` target in Xcode if they are not picked up
automatically by the synchronized group.

If a font file is missing, `DesignSystem/Typography.swift` falls back to the system font, so the
app still builds and runs — it just won't be on-brand.

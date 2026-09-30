# Self-hosted typefaces

The redesign ships three OFL typefaces as **local** font files so that builds
never depend on `fonts.googleapis.com` (offline/CI builds work, and no browser
request ever leaves our origin).

| File | Family | Role |
| --- | --- | --- |
| `archivo-black-latin-400-normal.woff2` | Archivo Black | Display headings (`font-display`) — chunky grotesque, single 400 weight |
| `space-grotesk-latin-wght-normal.woff2` | Space Grotesk (variable 300–700) | Body / UI (`font-sans`) |
| `space-mono-latin-400.woff2`, `space-mono-latin-700.woff2` | Space Mono | Labels, tags, numbers (`font-mono`) |

Files are the Latin subsets published by [Fontsource](https://fontsource.org)
(`@fontsource/archivo-black`, `@fontsource-variable/space-grotesk`,
`@fontsource/space-mono`), which in turn packages the upstream Google Fonts
releases. All three are licensed under the SIL Open Font License 1.1 — the full
licence text, including the per-family copyright notices, is in `OFL.txt`.

They are wired up with `next/font/local` in `app/layout.tsx`.

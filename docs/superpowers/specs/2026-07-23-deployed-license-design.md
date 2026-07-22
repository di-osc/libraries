# Deployed License Design

## Goal

Ensure every static production export includes the existing MIT license at
`out/LICENSE.txt` without adding a visible license link to the site.

## Design

- Add `public/LICENSE.txt` as an exact copy of the repository-root `LICENSE`.
- Rely on the existing Next.js static export behavior to copy files from
  `public/` into `out/`.
- Do not change the footer, navigation, page content, or other user interface.
- Keep the original spaCy, ExplosionAI, and Matthew Honnibal copyright notice
  and the complete MIT terms unchanged.

## Verification

- Compare `LICENSE` and `public/LICENSE.txt` byte for byte.
- Run the production build.
- Confirm `out/LICENSE.txt` exists and is byte-for-byte identical to `LICENSE`.
- Confirm the working tree contains no generated `out/` files because build
  output remains ignored.

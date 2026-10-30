<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project conventions

- Next.js App Router; server components and server actions first. Database is the source of truth. No Redux; local UI uses useState/useReducer.
- Kebab-case files/folders; PascalCase components/types; camelCase functions; constants UPPER_SNAKE_CASE. Framework-reserved filenames are exceptions.
- Unit tests live beside source. Run npm test, npm run typecheck, npm run build before pushing.
- Match the compact calm UI, mobile bottom navigation, and hotel scope in Account. Semantic HTML, visible keyboard focus, responsive layouts, skeleton loading, mutation feedback.
- Enforce hotel membership and record ownership on the server, inside mutation transactions. Never rely on hidden UI or client-provided role/owner/group.
- Demo is localhost only. Never commit .env files, ADC credentials, .data, or user photos. Production uses Firebase Admin SDK with closed client rules.

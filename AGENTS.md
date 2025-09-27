# Repository Guidelines

## Project Structure & Module Organization
- Source: `App.tsx`, `index.tsx`; Vite config `vite.config.ts`, types in `types.ts`.
- UI in `components/` (e.g., `components/Toast.tsx`, `components/ItemInput.tsx`).
- Logic in `services/` (Gemini, Firebase, import/export, dedup, suggestions).
- Reusable hooks in `hooks/`; static files in `assets/`; build output in `dist/`.
- Deployment config: `netlify.toml`; local env: `.env.local`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start Vite dev server with HMR.
- `npm run build`: production build to `dist/`.
- `npm run preview`: serve the production build locally.
- Deploy (Netlify): `netlify deploy --prod --dir=dist`.

## Coding Style & Naming Conventions
- Stack: React 19 + TypeScript, Vite. Use functional components and hooks.
- Indentation: 2 spaces; keep files typed (`.ts`/`.tsx`).
- File naming: components `PascalCase` (e.g., `Toast.tsx`), hooks `useX.ts`, services `camelCase.ts` (e.g., `geminiService.ts`).
- Exports: functions/vars `camelCase`, types/interfaces `PascalCase`.
- Prefer composition over inheritance; keep UI logic in components and side-effects in `services/`.

## Testing Guidelines
- No test runner is configured yet. Recommended: Vitest + React Testing Library.
- Place tests alongside sources as `*.test.ts` or `*.test.tsx`.
- Focus on `services/` for unit tests; mock network (Gemini/Firebase) and avoid hitting external APIs.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`). Use imperative mood and concise scope.
- PRs: include a clear description, linked issues, screenshots or terminal output when UI/UX changes; call out env or migration steps.
- Keep PRs focused; update `README.md` when behavior or setup changes.

## Security & Configuration Tips
- Required env: `.env.local` with `VITE_GEMINI_API_KEY=...`. Do not commit secrets.
- Firebase setup lives in `services/firebaseService.ts`; use environment-specific values and avoid hardcoded keys.
- Avoid logging PII; redact emails and user IDs in debug output.


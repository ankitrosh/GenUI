# Frontend (Vite + React + Tailwind)

## Setup
```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts
- `npm run dev` – start Vite dev server
- `npm run build` – type-check then build for production
- `npm run preview` – serve the production build locally
- `npm run lint` – ESLint
- `npm run format` – Prettier

## Notes
- Tailwind is wired via `tailwind.config.js` and `src/index.css` (utility-first styling).
- Path alias `@/` → `src/` (configured in `vite.config.ts`).

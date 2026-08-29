// index.js — DSH entry point. Re-exports the compiled apply() from lib/.
// Keeping this file in the repo root so DSH's `main` field resolves to a
// conventional location; the real implementation lives in lib/index.js.

export { name, inject, apply, default } from './lib/index.js';

/**
 * Ported from the Gatsby project's `api/date.js`, which lived outside `src/`
 * because Vercel did not support Gatsby Functions. In Next it is an ordinary
 * Route Handler.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(new Date().toString());
}

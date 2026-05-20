export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM = 'https://www.skills.sh/api/search';
const MAX_QUERY_LEN = 100;
const MAX_LIMIT = 100;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY_LEN);
  const limitParam = Number(url.searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(1, Math.floor(limitParam)), MAX_LIMIT) : 50;

  if (q.length < 2) {
    return Response.json({ query: q, skills: [], count: 0 }, { status: 200 });
  }

  const upstreamUrl = `${UPSTREAM}?q=${encodeURIComponent(q)}&limit=${limit}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      return Response.json(
        { error: 'upstream_error', status: upstream.status },
        { status: 502 },
      );
    }
    const data = await upstream.json();
    return Response.json(data, {
      status: 200,
      headers: { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return Response.json({ error: 'fetch_failed', message }, { status: 502 });
  }
}

import {
  FEED_TYPES,
  parseRscPayload,
  type FeedType,
} from '@/lib/tools/implementations/skills-feed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM_BY_TYPE: Record<FeedType, string> = {
  'all-time': 'https://www.skills.sh/',
  trending: 'https://www.skills.sh/trending',
  hot: 'https://www.skills.sh/hot',
};

const MAX_SKILLS = 50;

function isFeedType(value: string | null): value is FeedType {
  return value !== null && (FEED_TYPES as readonly string[]).includes(value);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type');

  if (!isFeedType(type)) {
    return Response.json(
      { error: 'invalid_type', allowed: FEED_TYPES },
      { status: 400 },
    );
  }

  const upstreamUrl = UPSTREAM_BY_TYPE[type];

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'Mozilla/5.0 (omne; +https://omne.app)',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      return Response.json(
        { error: 'upstream_error', status: upstream.status },
        { status: 502 },
      );
    }

    const html = await upstream.text();
    const skills = parseRscPayload(html, type).slice(0, MAX_SKILLS);

    if (html.length > 0 && skills.length === 0) {
      return Response.json(
        { error: 'feed_unavailable' },
        { status: 502 },
      );
    }

    return Response.json(
      { type, skills, count: skills.length },
      {
        status: 200,
        headers: {
          'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return Response.json({ error: 'fetch_failed', message }, { status: 502 });
  }
}

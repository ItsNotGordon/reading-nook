-- Server-side cache for Google Books discover results to reduce API usage
create table if not exists public.discover_cache (
  genre text not null,
  page int not null default 0,
  results jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  primary key (genre, page)
);

-- No RLS needed -- only accessed server-side via service role

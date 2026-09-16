-- Imágenes de los comunicados del Consejo. Tabla aditiva: no toca nada previo.
-- A diferencia de las evidencias, estas imágenes son públicas una vez que el
-- comunicado está publicado, pero se sirven igualmente a través de la
-- aplicación: la clave de servicio nunca llega al navegador.
create table public.mpd_news_media (
  id uuid primary key,
  news_id text not null check (length(news_id) between 1 and 80),
  position smallint not null default 0 check (position between 0 and 19),
  caption text not null default '' check (length(caption) <= 160),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size integer not null check (byte_size between 1 and 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  content_base64 text not null check (length(content_base64) <= 13981016),
  created_at timestamptz not null default now(),
  constraint valid_base64 check (content_base64 ~ '^[A-Za-z0-9+/]+={0,2}$' and length(content_base64) % 4 = 0),
  constraint media_size check (octet_length(decode(content_base64,'base64')) = byte_size),
  constraint media_digest check (encode(sha256(decode(content_base64,'base64')),'hex') = sha256)
);
create index mpd_news_media_news_idx on public.mpd_news_media(news_id, position);
alter table public.mpd_news_media enable row level security;
revoke all on public.mpd_news_media from anon, authenticated;
grant select, insert, delete on public.mpd_news_media to service_role;
comment on table public.mpd_news_media is 'Imagenes de comunicados en Base64. Se sirven por la aplicacion tras comprobar que el comunicado esta publicado.';

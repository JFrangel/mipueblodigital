-- Additive table, independent of any previous application version.
create table public.mpd_evidence_originals (
  id uuid primary key,
  incident_id text not null check (length(incident_id) between 1 and 160),
  owner_uid text not null check (length(owner_uid) between 1 and 128),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size integer not null check (byte_size between 1 and 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  content_base64 text not null check (length(content_base64) <= 13981016),
  created_at timestamptz not null default now(),
  constraint valid_base64 check (content_base64 ~ '^[A-Za-z0-9+/]+={0,2}$' and length(content_base64) % 4 = 0),
  constraint original_size check (octet_length(decode(content_base64,'base64')) = byte_size),
  constraint original_digest check (encode(sha256(decode(content_base64,'base64')),'hex') = sha256)
);
create index mpd_evidence_incident_idx on public.mpd_evidence_originals(incident_id);
alter table public.mpd_evidence_originals enable row level security;
revoke all on public.mpd_evidence_originals from anon, authenticated;
grant select, insert, delete on public.mpd_evidence_originals to service_role;
comment on table public.mpd_evidence_originals is 'Original Base64. Server-only access after Firebase authorization. Never include contents in public lists.';

-- =====================================================================
--  01_schema.sql — Pohon Keluarga Bani H. Kholid Ismail Noer
--  Jalankan PERTAMA di Supabase → SQL Editor → New query → Run.
--  Aman dijalankan ulang (idempotent).
--
--  Model keamanan:
--   • Semua tabel memakai Row Level Security (RLS).
--   • Pengunjung anonim (anon key) TIDAK bisa membaca apa pun.
--   • Anggota keluarga membaca data lewat server Next.js (service role)
--     setelah lolos login nama + tanggal lahir.
--   • Hanya akun yang terdaftar di tabel public.admins yang bisa
--     menambah / mengubah / menghapus data dan foto.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABEL ANGGOTA KELUARGA
-- ---------------------------------------------------------------------
create table if not exists public.members (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null check (char_length(full_name) between 2 and 120),
  nickname      text check (nickname is null or char_length(nickname) <= 40),
  gender        text check (gender in ('L', 'P')),
  birth_date    date check (birth_date is null or birth_date >= '1800-01-01'),
  birth_year    int  check (birth_year is null or birth_year between 1800 and 2200),
  domicile      text check (domicile is null or char_length(domicile) <= 80),
  is_deceased   boolean not null default false,
  photo_path    text check (photo_path is null or char_length(photo_path) <= 300),
  bio           text check (bio is null or char_length(bio) <= 1500),
  -- keturunan = garis darah | pasangan = suami/istri (menantu) | bawaan = anak bawaan pasangan
  member_type   text not null default 'keturunan' check (member_type in ('keturunan', 'pasangan', 'bawaan')),
  -- orang tua di garis keluarga. RESTRICT: anggota yang masih punya anak tidak bisa dihapus.
  parent_id     uuid references public.members(id) on delete restrict,
  -- orang tua lainnya (ayah/ibu pasangan dari parent_id)
  co_parent_id  uuid references public.members(id) on delete set null,
  birth_order   int check (birth_order is null or birth_order between 1 and 60),
  hafalan_juz   int check (hafalan_juz is null or hafalan_juz between 0 and 30),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint members_parent_not_self   check (parent_id is null or parent_id <> id),
  constraint members_coparent_not_self check (co_parent_id is null or co_parent_id <> id),
  constraint members_parents_differ    check (parent_id is null or co_parent_id is null or parent_id <> co_parent_id)
);
create index if not exists members_parent_idx    on public.members (parent_id);
create index if not exists members_coparent_idx  on public.members (co_parent_id);
create index if not exists members_birthdate_idx on public.members (birth_date);

-- ---------------------------------------------------------------------
-- 2. TABEL PERNIKAHAN (mendukung lebih dari satu pasangan)
-- ---------------------------------------------------------------------
create table if not exists public.marriages (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references public.members(id) on delete cascade, -- anggota garis keluarga
  spouse_id       uuid not null references public.members(id) on delete cascade, -- pasangannya
  marriage_order  int  not null default 1 check (marriage_order between 1 and 10),
  status          text check (status in ('menikah', 'cerai', 'wafat')),           -- null = tidak dicantumkan
  created_at      timestamptz not null default now(),
  constraint marriages_not_self check (member_id <> spouse_id),
  constraint marriages_unique   unique (member_id, spouse_id)
);
create index if not exists marriages_spouse_idx on public.marriages (spouse_id);

-- ---------------------------------------------------------------------
-- 3. ADMIN, LOG PERCOBAAN LOGIN, AUDIT
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.login_attempts (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_ip_idx on public.login_attempts (ip_hash, created_at desc);

create table if not exists public.audit_logs (
  id          bigint generated always as identity primary key,
  actor       uuid,
  action      text not null,
  table_name  text not null,
  record_id   uuid,
  summary     text,
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------
-- 4. FUNGSI & TRIGGER
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Normalisasi nama + isi birth_year otomatis + updated_at
create or replace function public.members_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.full_name  := btrim(regexp_replace(new.full_name, '\s+', ' ', 'g'));
  new.nickname   := nullif(btrim(new.nickname), '');
  new.domicile   := nullif(btrim(new.domicile), '');
  new.bio        := nullif(btrim(new.bio), '');
  if new.birth_date is not null then
    new.birth_year := extract(year from new.birth_date)::int;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists members_before_write on public.members;
create trigger members_before_write before insert or update on public.members
  for each row execute function public.members_before_write();

-- Cegah relasi melingkar (A anak B, B anak A)
create or replace function public.members_prevent_cycle()
returns trigger language plpgsql set search_path = '' as $$
declare
  cur uuid := new.parent_id;
  steps int := 0;
begin
  while cur is not null loop
    if cur = new.id then
      raise exception 'Relasi melingkar tidak diizinkan (seseorang tidak bisa menjadi keturunan dirinya sendiri)';
    end if;
    select m.parent_id into cur from public.members m where m.id = cur;
    steps := steps + 1;
    exit when steps > 200;
  end loop;
  return new;
end $$;

drop trigger if exists members_prevent_cycle on public.members;
create trigger members_prevent_cycle before update of parent_id on public.members
  for each row execute function public.members_prevent_cycle();

-- Catatan perubahan oleh admin
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_logs (actor, action, table_name, record_id, summary)
  values (
    auth.uid(), tg_op, tg_table_name, (rec->>'id')::uuid,
    coalesce(rec->>'full_name', 'pasangan: ' || coalesce(rec->>'member_id', '') || ' ↔ ' || coalesce(rec->>'spouse_id', ''))
  );
  return coalesce(new, old);
end $$;

drop trigger if exists members_audit on public.members;
create trigger members_audit after insert or update or delete on public.members
  for each row execute function public.audit_trigger();
drop trigger if exists marriages_audit on public.marriages;
create trigger marriages_audit after insert or update or delete on public.marriages
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.members        enable row level security;
alter table public.marriages      enable row level security;
alter table public.admins         enable row level security;
alter table public.login_attempts enable row level security;
alter table public.audit_logs     enable row level security;

-- Anonim tidak punya akses sama sekali (lapisan pertahanan tambahan selain RLS)
revoke all on public.members, public.marriages, public.admins, public.login_attempts, public.audit_logs from anon;

-- members: hanya admin
drop policy if exists "members_admin_select" on public.members;
drop policy if exists "members_admin_insert" on public.members;
drop policy if exists "members_admin_update" on public.members;
drop policy if exists "members_admin_delete" on public.members;
create policy "members_admin_select" on public.members for select to authenticated using (public.is_admin());
create policy "members_admin_insert" on public.members for insert to authenticated with check (public.is_admin());
create policy "members_admin_update" on public.members for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members_admin_delete" on public.members for delete to authenticated using (public.is_admin());

-- marriages: hanya admin
drop policy if exists "marriages_admin_select" on public.marriages;
drop policy if exists "marriages_admin_insert" on public.marriages;
drop policy if exists "marriages_admin_update" on public.marriages;
drop policy if exists "marriages_admin_delete" on public.marriages;
create policy "marriages_admin_select" on public.marriages for select to authenticated using (public.is_admin());
create policy "marriages_admin_insert" on public.marriages for insert to authenticated with check (public.is_admin());
create policy "marriages_admin_update" on public.marriages for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "marriages_admin_delete" on public.marriages for delete to authenticated using (public.is_admin());

-- audit_logs: admin hanya bisa membaca (insert lewat trigger)
drop policy if exists "audit_admin_select" on public.audit_logs;
create policy "audit_admin_select" on public.audit_logs for select to authenticated using (public.is_admin());

-- admins & login_attempts: TANPA policy → hanya service role (server) yang bisa akses.

-- ---------------------------------------------------------------------
-- 6. STORAGE FOTO (bucket privat, maks 2 MB, hanya JPG/PNG/WEBP)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-photos', 'family-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "family_photos_admin_select" on storage.objects;
drop policy if exists "family_photos_admin_insert" on storage.objects;
drop policy if exists "family_photos_admin_update" on storage.objects;
drop policy if exists "family_photos_admin_delete" on storage.objects;
create policy "family_photos_admin_select" on storage.objects for select to authenticated
  using (bucket_id = 'family-photos' and public.is_admin());
create policy "family_photos_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'family-photos' and public.is_admin());
create policy "family_photos_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'family-photos' and public.is_admin());
create policy "family_photos_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'family-photos' and public.is_admin());

-- Selesai. Lanjutkan dengan 02_seed.sql

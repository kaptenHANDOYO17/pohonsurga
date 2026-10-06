-- =====================================================================
--  03_admin.sql — Jadikan akun Anda sebagai ADMIN
--  Langkah:
--   1. Supabase → Authentication → Users → "Add user" → "Create new user"
--      isi email + password kuat (min. 12 karakter), centang "Auto Confirm User".
--   2. Ganti email di bawah dengan email tersebut, lalu Run.
-- =====================================================================

insert into public.admins (user_id)
select id from auth.users where email = 'GANTI-DENGAN-EMAIL-ADMIN@gmail.com'
on conflict (user_id) do nothing;

-- Pastikan berhasil (harus muncul 1 baris berisi email Anda):
select a.user_id, u.email, a.created_at
from public.admins a join auth.users u on u.id = a.user_id;

-- Untuk mencabut hak admin seseorang:
-- delete from public.admins where user_id = (select id from auth.users where email = 'email@contoh.com');

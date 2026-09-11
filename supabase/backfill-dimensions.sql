-- ============================================================
-- ENPEI - optional backfill: correct the recorded pixel sizes
-- ============================================================
-- Three photographs uploaded before the ingest pipeline was fixed
-- recorded the ORIGINAL file's dimensions instead of the served
-- derivative's. The aspect ratio was always right, so nothing looks
-- wrong; the only effect is that next/image is told the source is
-- larger than it is. Running this tightens its srcset.
--
-- Safe to skip: new uploads are already correct.
-- ============================================================

update public.photos set width = 2560, height = 2560
  where id = '840ca5b0-0591-4db9-95fc-8202fe8cf112';   -- was 5696x5696
update public.photos set width = 1707, height = 2560
  where id = '32e93a57-b5f9-472c-bd6a-d430d11a20e7';   -- was 5696x8544
update public.photos set width = 2560, height = 1707
  where id = '9cd86cfe-7176-4826-b4cf-4f79a638a940';   -- was 6408x4272

select title, width, height from public.photos order by created_at;
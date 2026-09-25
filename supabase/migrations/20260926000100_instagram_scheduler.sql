-- Supabase Cron sends a short-lived HMAC signature to the Vercel worker.
-- No raw credential is written to cron.job or pg_net request headers.
-- The job is inert until instagram_scheduler_secret is stored in Vault.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create schema if not exists instagram_internal;
revoke all on schema instagram_internal from public, anon, authenticated;

create function instagram_internal.invoke_publisher() returns void
language plpgsql security definer set search_path = '' as $function$
declare
  signing_secret text;
  signing_time text;
  message text;
  signature text;
begin
  select decrypted_secret into signing_secret
    from vault.decrypted_secrets where name = 'instagram_scheduler_secret' limit 1;
  if signing_secret is null or char_length(signing_secret) < 32 then return; end if;
  signing_time := extract(epoch from clock_timestamp())::bigint::text;
  message := signing_time || '.GET./api/instagram/scheduler';
  signature := encode(extensions.hmac(convert_to(message, 'UTF8'),
    convert_to(signing_secret, 'UTF8'), 'sha256'), 'hex');
  perform net.http_get(
    url := 'https://freebee.world/api/instagram/scheduler',
    headers := jsonb_build_object('X-Instagram-Cron-Time', signing_time,
      'X-Instagram-Cron-Signature', signature),
    timeout_milliseconds := 20000
  );
end;
$function$;
revoke all on function instagram_internal.invoke_publisher() from public, anon, authenticated;

select cron.schedule('instagram-publisher-minute', '* * * * *',
  'select instagram_internal.invoke_publisher()');

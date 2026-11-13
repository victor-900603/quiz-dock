-- Restarting a practice session clears its attempts. The start RPC runs as
-- security invoker, so authenticated users need delete access to their own
-- attempts for that reset path.
grant delete on public.attempts to authenticated;

create policy "attempts_delete_own"
on public.attempts for delete
to authenticated
using (user_id = auth.uid());

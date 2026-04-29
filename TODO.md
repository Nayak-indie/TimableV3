# Refactor Supabase Client Types — TODO

## Steps

1. [x] Create `src/lib/supabase/types.ts` with `AppQueryBuilder` and `AppSupabaseClient` interfaces
2. [x] Update `src/lib/dev/dev-supabase.ts` to implement the new interfaces
3. [x] Update `src/lib/supabase/client.ts` to use `AppSupabaseClient` and remove invalid cast
4. [x] Update `src/lib/supabase/server.ts` to use `AppSupabaseClient` and remove invalid cast
5. [ ] Verify build passes with `npx tsc --noEmit`


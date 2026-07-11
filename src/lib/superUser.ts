/**
 * @deprecated Use the `useIsSuperUser()` hook (which calls the server-side
 * `is_super_user` RPC) instead of any client-side ID comparison.
 *
 * The old hard-coded UUID was a client-only gate with no server enforcement.
 * It has been removed intentionally. The canonical super user is now bound
 * server-side to a single verified email address via `super_user_config`.
 */
export const isSuperUser = (_userId: string | null | undefined): boolean => false;

/**
 * The single super-user for this deployment.
 * Only this account sees developer testing tools regardless of any other role.
 */
export const SUPER_USER_ID = '2be7250e-e9ac-4e7e-aede-83bdb073acb8';

export const isSuperUser = (userId: string | null | undefined): boolean =>
  !!userId && userId === SUPER_USER_ID;

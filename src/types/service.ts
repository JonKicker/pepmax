/**
 * Shared result type for all service layer functions.
 *
 * Discriminated union — TypeScript narrows correctly:
 *   if (result.error) { // result.data is null here }
 *   else { // result.data is T here }
 */
export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: Error };

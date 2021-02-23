/**
 * Utility for selecting data.
 */
export interface IDataSelector {
  selectArrayElement: <T>(array: T[]) => T;
}

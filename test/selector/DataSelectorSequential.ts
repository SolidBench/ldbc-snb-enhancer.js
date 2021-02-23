import type { IDataSelector } from '../../lib/selector/IDataSelector';

export class DataSelectorSequential implements IDataSelector {
  public i = 0;

  public selectArrayElement<T>(array: T[]): T {
    return array[this.i++ % array.length];
  }
}

import type { IDataSelector } from './IDataSelector';

/**
 * A random data selector.
 */
export class DataSelectorRandom implements IDataSelector {
  private seed: number;

  public constructor(seed: number) {
    this.seed = seed;
  }

  public nextRandom(): number {
    const x = Math.sin(this.seed++) * 10_000;
    return x - Math.floor(x);
  }

  public selectArrayElement<T>(array: T[]): T {
    return array[Math.floor(this.nextRandom() * array.length)];
  }
}

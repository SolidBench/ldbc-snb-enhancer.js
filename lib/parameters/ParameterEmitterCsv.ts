import type { WriteStream } from 'node:fs';
import * as fs from 'node:fs';
import type { IParameterEmitter } from './IParameterEmitter';

/**
 * Emits parameters as CSV files.
 */
export class ParameterEmitterCsv implements IParameterEmitter {
  private readonly destinationPath: string;
  private readonly fileStream: WriteStream;

  private headerLength = -1;

  public constructor(destinationPath: string) {
    this.destinationPath = destinationPath;

    this.fileStream = fs.createWriteStream(this.destinationPath);
  }

  public emitHeader(columnNames: string[]): void {
    // Validate columns
    if (this.headerLength === -1) {
      this.headerLength = columnNames.length;
    } else {
      throw new Error('Attempted to emit header more than once.');
    }

    this.emitRow(columnNames);
  }

  public emitRow(columns: string[]): void {
    // Validate columns
    if (columns.length !== this.headerLength) {
      throw new Error(`A column of length ${columns.length} was emitted, while length ${this.headerLength} is required.`);
    }

    this.fileStream.write(`${columns.join(',')}\n`);
  }

  public flush(): void {
    this.fileStream.end();
  }
}

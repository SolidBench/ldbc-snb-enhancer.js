import type { ILogger } from './ILogger';

/**
 * Logs messages to stdout.
 */
export class LoggerStdout implements ILogger {
  public log(message: string): void {
    process.stdout.write(`${message}\n`);
  }
}

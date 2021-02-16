import type { ReadStream, WriteStream } from 'tty';
import type { IComponentsManagerBuilderOptions } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import type { Enhancer } from './Enhancer';

/**
 * Generic run function for starting the fragmenter from a given config
 * @param args - Command line arguments.
 * @param stdin - Standard input stream.
 * @param stdout - Standard output stream.
 * @param stderr - Standard error stream.
 * @param properties - Components loader properties.
 */
export const runCustom = function(
  args: string[],
  stdin: ReadStream,
  stdout: WriteStream,
  stderr: WriteStream,
  properties: IComponentsManagerBuilderOptions<Enhancer>,
): void {
  (async(): Promise<void> => {
    if (args.length !== 1) {
      stderr.write(`Missing config path argument.
Usage:
  ldbc-snb-enhancer path/to/config.json
`);
      return;
    }
    const configPath = args[0];

    // Setup from config file
    const manager = await ComponentsManager.build(properties);
    await manager.configRegistry.register(configPath);
    const enhancer: Enhancer = await manager.instantiate('urn:ldbc-snb-enhancer:default');
    return await enhancer.generate();
  })().then((): void => {
    // Done
  }).catch(error => {
    process.stderr.write(`${error.stack}\n`);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  });
};

/**
 * Run function for starting the server from the command line
 * @param moduleRootPath - Path to the module's root.
 */
export const runCli = function(moduleRootPath: string): void {
  const argv = process.argv.slice(2);
  runCustom(argv, process.stdin, process.stdout, process.stderr, { mainModulePath: moduleRootPath });
};

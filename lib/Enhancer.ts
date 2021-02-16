/**
 * Enhances a given dataset.
 */
export class Enhancer {
  private readonly personsPath: string;

  public constructor(options: IEnhancerOptions) {
    this.personsPath = options.personsPath;
  }

  /**
   * Generates an auxiliary dataset.
   */
  public async generate(): Promise<void> {
    // TODO
  }
}

export interface IEnhancerOptions {
  /**
   * Path to an LDBC SNB RDF persons dataset file.
   */
  personsPath: string;
}

import * as fs from 'fs';
import type { Writable } from 'stream';
import { PassThrough } from 'stream';
import type * as RDF from 'rdf-js';
import { RdfObjectLoader } from 'rdf-object';
import rdfParser from 'rdf-parse';
import rdfSerializer from 'rdf-serialize';
import type { IEnhancementContext } from './handlers/IEnhancementContext';
import type { IEnhancementHandler } from './handlers/IEnhancementHandler';
import type { ILogger } from './logging/ILogger';
import type { IDataSelector } from './selector/IDataSelector';

/**
 * Enhances a given dataset.
 */
export class Enhancer {
  public static readonly CONTEXT_LDBC_SNB = require('./context-ldbc-snb.json');

  private readonly personsPath: string;
  private readonly destinationPath: string;
  private readonly dataSelector: IDataSelector;
  private readonly handlers: IEnhancementHandler[];
  private readonly logger?: ILogger;

  private readonly rdfObjectLoader: RdfObjectLoader;

  public constructor(options: IEnhancerOptions) {
    this.personsPath = options.personsPath;
    this.destinationPath = options.destinationPath;
    this.dataSelector = options.dataSelector;
    this.handlers = options.handlers;
    this.logger = options.logger;

    this.rdfObjectLoader = new RdfObjectLoader({ context: Enhancer.CONTEXT_LDBC_SNB });
  }

  /**
   * Generates an auxiliary dataset.
   */
  public async generate(): Promise<void> {
    // Make sure our object loader is initialized
    this.logger?.log('Loading context');
    await this.rdfObjectLoader.context;

    // Prepare output stream
    this.logger?.log('Preparing output stream');
    const writeStream: RDF.Stream & Writable = <any> new PassThrough({ objectMode: true });
    const fileStream = fs.createWriteStream(this.destinationPath);
    rdfSerializer.serialize(writeStream, { contentType: 'text/turtle' }).pipe(fileStream);

    // Prepare context
    this.logger?.log('Reading background data');
    const people = await this.extractPeople();
    const context: IEnhancementContext = {
      rdfObjectLoader: this.rdfObjectLoader,
      dataSelector: this.dataSelector,
      people,
    };

    // Generate data
    for (const handler of this.handlers) {
      this.logger?.log(`Running ${handler.constructor.name}`);
      await handler.generate(writeStream, context);
    }

    // Close output stream
    this.logger?.log('Ending');
    writeStream.end();
  }

  public extractPeople(): Promise<RDF.NamedNode[]> {
    return new Promise<RDF.NamedNode[]>((resolve, reject) => {
      // Prepare RDF terms to compare with
      const termType = this.rdfObjectLoader.createCompactedResource('rdf:type').term;
      const termPerson = this.rdfObjectLoader.createCompactedResource('snvoc:Person').term;

      const people: RDF.NamedNode[] = [];
      const stream = rdfParser.parse(fs.createReadStream(this.personsPath), { path: this.personsPath });
      stream.on('error', reject);
      stream.on('data', (quad: RDF.Quad) => {
        if (quad.subject.termType === 'NamedNode' &&
          quad.predicate.equals(termType) &&
          quad.object.equals(termPerson)) {
          people.push(quad.subject);
        }
      });
      stream.on('end', () => {
        resolve(people);
      });
    });
  }
}

export interface IEnhancerOptions {
  /**
   * Path to an LDBC SNB RDF persons dataset file.
   */
  personsPath: string;
  /**
   * Path to the output destination file.
   */
  destinationPath: string;
  /**
   * Data selector.
   */
  dataSelector: IDataSelector;
  /**
   * Enhancement handlers.
   */
  handlers: IEnhancementHandler[];
  /**
   * Logger.
   */
  logger?: ILogger;
}

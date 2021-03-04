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
  private readonly activitiesPath: string;
  private readonly staticPath: string;
  private readonly destinationPath: string;
  private readonly dataSelector: IDataSelector;
  private readonly handlers: IEnhancementHandler[];
  private readonly logger?: ILogger;

  private readonly rdfObjectLoader: RdfObjectLoader;

  public constructor(options: IEnhancerOptions) {
    this.personsPath = options.personsPath;
    this.activitiesPath = options.activitiesPath;
    this.staticPath = options.staticPath;
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
    this.logger?.log('Reading background data: people');
    const { people, peopleLocatedInCities } = await this.extractPeople();
    this.logger?.log('Reading background data: activities');
    const posts = await this.extractPosts();
    this.logger?.log('Reading background data: cities');
    const cities = await this.extractCities();
    const context: IEnhancementContext = {
      rdfObjectLoader: this.rdfObjectLoader,
      dataSelector: this.dataSelector,
      people,
      peopleLocatedInCities,
      posts,
      cities,
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

  public extractPeople(): Promise<{ people: RDF.NamedNode[]; peopleLocatedInCities: Record<string, RDF.NamedNode> }> {
    return new Promise((resolve, reject) => {
      // Prepare RDF terms to compare with
      const termType = this.rdfObjectLoader.createCompactedResource('rdf:type').term;
      const termPerson = this.rdfObjectLoader.createCompactedResource('snvoc:Person').term;
      const termIsLocatedIn = this.rdfObjectLoader.createCompactedResource('snvoc:isLocatedIn').term;

      const people: RDF.NamedNode[] = [];
      const peopleLocatedInCities: Record<string, RDF.NamedNode> = {};
      const stream = rdfParser.parse(fs.createReadStream(this.personsPath), { path: this.personsPath });
      stream.on('error', reject);
      stream.on('data', (quad: RDF.Quad) => {
        if (quad.subject.termType === 'NamedNode' &&
          quad.predicate.equals(termType) &&
          quad.object.equals(termPerson)) {
          people.push(quad.subject);
        }
        if (quad.subject.termType === 'NamedNode' &&
          quad.predicate.equals(termIsLocatedIn) &&
          quad.object.termType === 'NamedNode') {
          peopleLocatedInCities[quad.subject.value] = quad.object;
        }
      });
      stream.on('end', () => {
        resolve({ people, peopleLocatedInCities });
      });
    });
  }

  public extractPosts(): Promise<RDF.NamedNode[]> {
    return new Promise<RDF.NamedNode[]>((resolve, reject) => {
      // Prepare RDF terms to compare with
      const termType = this.rdfObjectLoader.createCompactedResource('rdf:type').term;
      const termPost = this.rdfObjectLoader.createCompactedResource('snvoc:Post').term;

      const posts: RDF.NamedNode[] = [];
      const stream = rdfParser.parse(fs.createReadStream(this.activitiesPath), { path: this.activitiesPath });
      stream.on('error', reject);
      stream.on('data', (quad: RDF.Quad) => {
        if (quad.subject.termType === 'NamedNode' &&
          quad.predicate.equals(termType) &&
          quad.object.equals(termPost)) {
          posts.push(quad.subject);
        }
      });
      stream.on('end', () => {
        resolve(posts);
      });
    });
  }

  public extractCities(): Promise<RDF.NamedNode[]> {
    return new Promise<RDF.NamedNode[]>((resolve, reject) => {
      // Prepare RDF terms to compare with
      const termType = this.rdfObjectLoader.createCompactedResource('rdf:type').term;
      const termCity = this.rdfObjectLoader.createCompactedResource('dbpedia-owl:City').term;

      const posts: RDF.NamedNode[] = [];
      const stream = rdfParser.parse(fs.createReadStream(this.staticPath), { path: this.staticPath });
      stream.on('error', reject);
      stream.on('data', (quad: RDF.Quad) => {
        if (quad.subject.termType === 'NamedNode' &&
          quad.predicate.equals(termType) &&
          quad.object.equals(termCity)) {
          posts.push(quad.subject);
        }
      });
      stream.on('end', () => {
        resolve(posts);
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
   * Path to an LDBC SNB RDF activities dataset file.
   */
  activitiesPath: string;
  /**
   * Path to an LDBC SNB RDF static dataset file.
   */
  staticPath: string;
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

import * as fs from 'fs';
import type { Writable } from 'stream';
import { PassThrough } from 'stream';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { RdfObjectLoader } from 'rdf-object';
import { rdfParser } from 'rdf-parse';
import { rdfSerializer } from 'rdf-serialize';
import type { IEnhancementContext } from './handlers/IEnhancementContext';
import type { IEnhancementHandler } from './handlers/IEnhancementHandler';
import type { ILogger } from './logging/ILogger';
import type { IParameterEmitter } from './parameters/IParameterEmitter';
import type { IDataSelector } from './selector/IDataSelector';

const DF = new DataFactory();

/**
 * Enhances a given dataset.
 */
export class Enhancer {
  public static readonly CONTEXT_LDBC_SNB = require('./context-ldbc-snb.json');

  private readonly personsPath: string;
  private readonly activitiesPath: string;
  private readonly staticPath: string;
  private readonly destinationPathData: string;
  private readonly dataSelector: IDataSelector;
  private readonly handlers: IEnhancementHandler[];
  private readonly logger?: ILogger;
  private readonly parameterEmitterPosts?: IParameterEmitter;
  private readonly parameterEmitterComments?: IParameterEmitter;

  private readonly rdfObjectLoader: RdfObjectLoader;

  public constructor(options: IEnhancerOptions) {
    this.personsPath = options.personsPath;
    this.activitiesPath = options.activitiesPath;
    this.staticPath = options.staticPath;
    this.destinationPathData = options.destinationPathData;
    this.dataSelector = options.dataSelector;
    this.handlers = options.handlers || [];
    this.logger = options.logger;
    this.parameterEmitterPosts = options.parameterEmitterPosts;
    this.parameterEmitterComments = options.parameterEmitterComments;

    this.rdfObjectLoader = new RdfObjectLoader({ context: Enhancer.CONTEXT_LDBC_SNB });

    this.parameterEmitterPosts?.emitHeader([ 'post' ]);
    this.parameterEmitterComments?.emitHeader([ 'comment' ]);
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
    const fileStream = fs.createWriteStream(this.destinationPathData);
    rdfSerializer.serialize(writeStream, { contentType: 'text/turtle' }).pipe(fileStream);

    // Prepare context
    this.logger?.log('Reading background data: people');
    const {
      people,
      peopleLocatedInCities,
      peopleKnows,
      peopleKnownBy,
      predicates,
      personClasses,
    } = await this.extractPeople();
    this.logger?.log('Reading background data: activities');
    const { posts, postsDetails, comments, activityClasses } = await this.extractActivities();
    this.logger?.log('Reading background data: cities');
    const cities = await this.extractCities();
    const classes: RDF.NamedNode[] = [ ...personClasses, ...activityClasses ];
    const context: IEnhancementContext = {
      rdfObjectLoader: this.rdfObjectLoader,
      dataSelector: this.dataSelector,
      people,
      peopleLocatedInCities,
      peopleKnows,
      peopleKnownBy,
      posts,
      postsDetails,
      comments,
      cities,
      predicates,
      classes,
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

  public extractPeople(): Promise<{
    people: RDF.NamedNode[];
    peopleLocatedInCities: Record<string, RDF.NamedNode>;
    peopleKnows: Record<string, RDF.NamedNode[]>;
    peopleKnownBy: Record<string, RDF.NamedNode[]>;
    predicates: RDF.NamedNode[];
    personClasses: RDF.NamedNode[];
  }> {
    return new Promise((resolve, reject) => {
      // Prepare RDF terms to compare with
      const termType = this.rdfObjectLoader.createCompactedResource('rdf:type').term;
      const termPerson = this.rdfObjectLoader.createCompactedResource('snvoc:Person').term;
      const termIsLocatedIn = this.rdfObjectLoader.createCompactedResource('snvoc:isLocatedIn').term;
      const termKnows = this.rdfObjectLoader.createCompactedResource('snvoc:knows').term;
      const termHasPerson = this.rdfObjectLoader.createCompactedResource('snvoc:hasPerson').term;

      const people: RDF.NamedNode[] = [];
      const peopleLocatedInCities: Record<string, RDF.NamedNode> = {};
      const peopleKnows: Record<string, RDF.NamedNode[]> = {};
      const peopleKnownBy: Record<string, RDF.NamedNode[]> = {};
      const predicates: Set<string> = new Set<string>();
      const classes: Set<string> = new Set<string>();
      const stream = rdfParser.parse(fs.createReadStream(this.personsPath), { path: this.personsPath });

      // Temporary variables to determine knows relationships
      let currentKnowsPerson: RDF.NamedNode | undefined;
      let currentKnowsNode: RDF.BlankNode | undefined;

      stream.on('error', reject);
      stream.on('data', (quad: RDF.Quad) => {
        // Extract people
        if (quad.subject.termType === 'NamedNode' &&
          quad.predicate.equals(termType) &&
          quad.object.equals(termPerson)) {
          people.push(quad.subject);
        }

        // Extract people located in cities
        if (quad.subject.termType === 'NamedNode' &&
          quad.predicate.equals(termIsLocatedIn) &&
          quad.object.termType === 'NamedNode') {
          peopleLocatedInCities[quad.subject.value] = quad.object;
        }

        // Extract people knows relationships
        // 1. Determine reified blank node identifying the relationships
        if (quad.subject.termType === 'NamedNode' &&
          quad.predicate.equals(termKnows) &&
          quad.object.termType === 'BlankNode') {
          currentKnowsPerson = quad.subject;
          currentKnowsNode = quad.object;
        }
        // 2. Determine the person linked to the relationships
        if (currentKnowsPerson &&
          quad.subject.equals(currentKnowsNode) &&
          quad.predicate.equals(termHasPerson) &&
          quad.object.termType === 'NamedNode') {
          if (!peopleKnows[currentKnowsPerson.value]) {
            peopleKnows[currentKnowsPerson.value] = [];
          }
          if (!peopleKnownBy[quad.object.value]) {
            peopleKnownBy[quad.object.value] = [];
          }
          peopleKnows[currentKnowsPerson.value].push(quad.object);
          peopleKnownBy[quad.object.value].push(currentKnowsPerson);

          currentKnowsPerson = undefined;
          currentKnowsNode = undefined;
        }

        // Determine predicates
        predicates.add(quad.predicate.value);

        // Determine classes
        if (quad.predicate.equals(termType)) {
          classes.add(quad.object.value);
        }
      });
      stream.on('end', () => {
        resolve({
          people,
          peopleLocatedInCities,
          peopleKnows,
          peopleKnownBy,
          predicates: [ ...predicates ].map(value => DF.namedNode(value)),
          personClasses: [ ...classes ].map(value => DF.namedNode(value)),
        });
      });
    });
  }

  public extractActivities(): Promise<{
    posts: RDF.NamedNode[];
    postsDetails: Record<string, RDF.Quad[]>;
    comments: RDF.NamedNode[];
    activityClasses: RDF.NamedNode[];
  }> {
    return new Promise<{
      posts: RDF.NamedNode[];
      postsDetails: Record<string, RDF.Quad[]>;
      comments: RDF.NamedNode[];
      activityClasses: RDF.NamedNode[];
    }>((resolve, reject) => {
      // Prepare RDF terms to compare with
      const termType = this.rdfObjectLoader.createCompactedResource('rdf:type').term;
      const termPost = this.rdfObjectLoader.createCompactedResource('snvoc:Post').term;
      const termComment = this.rdfObjectLoader.createCompactedResource('snvoc:Comment').term;

      const posts: RDF.NamedNode[] = [];
      const postsDetails: Record<string, RDF.Quad[]> = {};
      const comments: RDF.NamedNode[] = [];
      const stream = rdfParser.parse(fs.createReadStream(this.activitiesPath), { path: this.activitiesPath });
      stream.on('error', reject);
      stream.on('data', (quad: RDF.Quad) => {
        if (quad.subject.termType === 'NamedNode' &&
          quad.predicate.equals(termType)) {
          if (quad.object.equals(termPost)) {
            posts.push(quad.subject);
            // Emit parameters
            this.parameterEmitterPosts?.emitRow([ quad.subject.value ]);
            postsDetails[quad.subject.value] = [];
          }
          if (quad.object.equals(termComment)) {
            comments.push(quad.subject);
            this.parameterEmitterComments?.emitRow([ quad.subject.value ]);
          }
        }
        if (quad.subject.termType === 'NamedNode') {
          const postDetails = postsDetails[quad.subject.value];
          if (postDetails) {
            postDetails.push(quad);
          }
        }
      });
      stream.on('end', () => {
        this.parameterEmitterPosts?.flush();
        this.parameterEmitterComments?.flush();
        resolve({
          posts,
          postsDetails,
          comments,
          activityClasses: [ DF.namedNode(termPost.value), DF.namedNode(termComment.value) ],
        });
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
  destinationPathData: string;
  /**
   * Data selector.
   */
  dataSelector: IDataSelector;
  /**
   * Enhancement handlers.
   */
  handlers?: IEnhancementHandler[];
  /**
   * Logger.
   */
  logger?: ILogger;
  /**
   * An optional parameter emitter for all available posts.
   */
  parameterEmitterPosts?: IParameterEmitter;
  /**
   * An optional parameter emitter for all available comments.
   */
  parameterEmitterComments?: IParameterEmitter;
}

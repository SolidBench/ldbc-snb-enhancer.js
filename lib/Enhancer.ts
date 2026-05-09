import * as fs from 'node:fs';
import type { Writable } from 'node:stream';
import { PassThrough } from 'node:stream';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { IRdfClassLoaderArgs } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import { rdfParser } from 'rdf-parse';
import { rdfSerializer } from 'rdf-serialize';
import type { IEnhancementContext } from './handlers/IEnhancementContext';
import type { IEnhancementHandler } from './handlers/IEnhancementHandler';
import type { ILogger } from './logging/ILogger';
import type { IParameterEmitter } from './parameters/IParameterEmitter';
import type { IDataSelector } from './selector/IDataSelector';
import type { TransformerReplaceIri } from './transformers/TransformerReplaceIri';

const DF = new DataFactory();

/**
 * Enhances a given dataset.
 */
export class Enhancer {
  // eslint-disable-next-line ts/no-var-requires, ts/no-require-imports, import/extensions, ts/naming-convention
  public static readonly CONTEXT_LDBC_SNB = <IRdfClassLoaderArgs>require('./context-ldbc-snb.json');

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

  private readonly similarityConfig?: ISimilarityConfig;

  public constructor(options: IEnhancerOptions) {
    this.personsPath = options.personsPath;
    this.activitiesPath = options.activitiesPath;
    this.staticPath = options.staticPath;
    this.destinationPathData = options.destinationPathData;
    this.dataSelector = options.dataSelector;
    // eslint-disable-next-line ts/prefer-nullish-coalescing
    this.handlers = options.handlers || [];
    this.logger = options.logger;
    this.parameterEmitterPosts = options.parameterEmitterPosts;
    this.parameterEmitterComments = options.parameterEmitterComments;

    this.rdfObjectLoader = new RdfObjectLoader({ context: Enhancer.CONTEXT_LDBC_SNB });

    this.parameterEmitterPosts?.emitHeader([ 'post' ]);
    this.parameterEmitterComments?.emitHeader([ 'comment' ]);

    this.similarityConfig = options.similarityConfig;
    if (this.similarityConfig) {
      this.similarityConfig.parameterEmitterSimilaritiesPeople.emitHeader(
        [ 'person', 'similarities' ],
      );
      this.similarityConfig.parameterEmitterSimilaritiesPosts.emitHeader(
        [ 'person', 'similarities' ],
      );
      this.similarityConfig.parameterEmitterSimilaritiesComments.emitHeader(
        [ 'person', 'similarities' ],
      );
    }
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
      interests,
      universities,
      peopleHasInterest,
      peopleStudyAt,
    } = await this.extractPeople();
    this.logger?.log('Reading background data: activities');
    const {
      posts,
      postsDetails,
      comments,
      activityClasses,
      // Similarity fields
      postsCreator,
      commentsCreator,
    } = await this.extractActivities();
    this.logger?.log('Reading background data: cities');
    const cities = await this.extractCities();

    if (this.similarityConfig) {
      this.logger?.log('Calculating similarities');
      const personToPost = this.personToActivities(postsCreator!);
      const personToComment = this.personToActivities(commentsCreator!);

      const peopleSemanticVectors = this.interestsToVector(
        peopleHasInterest!,
        peopleStudyAt!,
        interests!,
        universities!,
      );

      await this.peopleSimilarities(peopleSemanticVectors, personToPost, personToComment);
    }

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
    // Similarity fields
    interests?: RDF.NamedNode[];
    universities?: RDF.NamedNode[];
    peopleHasInterest?: Record<string, RDF.NamedNode[]>;
    peopleStudyAt?: Record<string, RDF.NamedNode[]>;
  }> {
    return new Promise((resolve, reject) => {
      const termType = this.rdfObjectLoader.createCompactedResource('rdf:type').term;
      const termPerson = this.rdfObjectLoader.createCompactedResource('snvoc:Person').term;
      const termIsLocatedIn = this.rdfObjectLoader.createCompactedResource('snvoc:isLocatedIn').term;
      const termKnows = this.rdfObjectLoader.createCompactedResource('snvoc:knows').term;
      const termHasPerson = this.rdfObjectLoader.createCompactedResource('snvoc:hasPerson').term;

      // Similarity terms
      const termStudyAt = this.rdfObjectLoader.createCompactedResource('snvoc:studyAt').term;
      const termhasOrganisation = this.rdfObjectLoader.createCompactedResource('snvoc:hasOrganisation').term;
      const termHasInterest = this.rdfObjectLoader.createCompactedResource('snvoc:hasInterest').term;

      const people: RDF.NamedNode[] = [];
      const peopleLocatedInCities: Record<string, RDF.NamedNode> = {};
      const peopleKnows: Record<string, RDF.NamedNode[]> = {};
      const peopleKnownBy: Record<string, RDF.NamedNode[]> = {};
      const predicates: Set<string> = new Set<string>();
      const classes: Set<string> = new Set<string>();

      // Similarity collections
      const interests: RDF.NamedNode[] = [];
      const universities: RDF.NamedNode[] = [];
      const peopleHasInterest: Record<string, RDF.NamedNode[]> = {};
      const peopleStudyAt: Record<string, RDF.NamedNode[]> = {};

      const stream = rdfParser.parse(fs.createReadStream(this.personsPath), { path: this.personsPath });

      let currentKnowsPerson: RDF.NamedNode | undefined;
      let currentKnowsNode: RDF.BlankNode | undefined;
      let currentStudyAtPerson: RDF.NamedNode | undefined;
      let currentStudyAtNode: RDF.BlankNode | undefined;

      stream.on('error', reject);
      stream.on('data', (quad: RDF.Quad) => {
        if (quad.subject.termType === 'NamedNode') {
          // Standard extraction
          if (quad.predicate.equals(termType) && quad.object.equals(termPerson)) {
            people.push(quad.subject);
          }

          if (quad.predicate.equals(termIsLocatedIn) && quad.object.termType === 'NamedNode') {
            peopleLocatedInCities[quad.subject.value] = quad.object;
          }

          if (quad.predicate.equals(termKnows) && quad.object.termType === 'BlankNode') {
            currentKnowsPerson = quad.subject;
            currentKnowsNode = quad.object;
          }

          if (this.similarityConfig) {
            // Similarity extraction
            if (quad.object.termType === 'NamedNode' && quad.predicate.equals(termHasInterest)) {
              interests.push(quad.object);
              if (!peopleHasInterest[quad.subject.value]) {
                peopleHasInterest[quad.subject.value] = [];
              }
              peopleHasInterest[quad.subject.value].push(quad.object);
            }

            if (quad.predicate.equals(termStudyAt) && quad.object.termType === 'BlankNode') {
              currentStudyAtPerson = quad.subject;
              currentStudyAtNode = quad.object;
            }
          }
        }

        // Standard relation resolutions
        if (currentKnowsPerson && quad.subject.equals(currentKnowsNode) &&
            quad.predicate.equals(termHasPerson) && quad.object.termType === 'NamedNode') {
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

        // Similarity relation resolutions
        if (this.similarityConfig && currentStudyAtPerson && quad.subject.equals(currentStudyAtNode) &&
            quad.predicate.equals(termhasOrganisation) && quad.object.termType === 'NamedNode') {
          if (!peopleStudyAt[currentStudyAtPerson.value]) {
            peopleStudyAt[currentStudyAtPerson.value] = [];
          }
          peopleStudyAt[currentStudyAtPerson.value].push(quad.object);
          universities.push(quad.object);

          currentStudyAtPerson = undefined;
          currentStudyAtNode = undefined;
        }

        predicates.add(quad.predicate.value);
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
          ...(this.similarityConfig && { interests, universities, peopleHasInterest, peopleStudyAt }),
        });
      });
    });
  }

  public extractActivities(): Promise<{
    posts: RDF.NamedNode[];
    postsDetails: Record<string, RDF.Quad[]>;
    comments: RDF.NamedNode[];
    activityClasses: RDF.NamedNode[];
    // Similarity fields
    postsCreator?: Record<string, RDF.Term[]>;
    commentsCreator?: Record<string, RDF.Term[]>;
  }> {
    return new Promise((resolve, reject) => {
      const termType = this.rdfObjectLoader.createCompactedResource('rdf:type').term;
      const termPost = this.rdfObjectLoader.createCompactedResource('snvoc:Post').term;
      const termComment = this.rdfObjectLoader.createCompactedResource('snvoc:Comment').term;
      const termHasCreator = this.rdfObjectLoader.createCompactedResource('snvoc:hasCreator').term;

      const posts: RDF.NamedNode[] = [];
      const postsDetails: Record<string, RDF.Quad[]> = {};
      const comments: RDF.NamedNode[] = [];

      const postsCreator: Record<string, RDF.Term[]> = {};
      const commentsCreator: Record<string, RDF.Term[]> = {};

      const stream = rdfParser.parse(fs.createReadStream(this.activitiesPath), { path: this.activitiesPath });
      stream.on('error', reject);
      stream.on('data', (quad: RDF.Quad) => {
        if (quad.subject.termType === 'NamedNode') {
          if (quad.predicate.equals(termType)) {
            if (quad.object.equals(termPost)) {
              posts.push(quad.subject);
              this.parameterEmitterPosts?.emitRow([ quad.subject.value ]);
              postsDetails[quad.subject.value] = [];
              if (this.similarityConfig) {
                postsCreator[quad.subject.value] = [];
              }
            }
            if (quad.object.equals(termComment)) {
              comments.push(quad.subject);
              this.parameterEmitterComments?.emitRow([ quad.subject.value ]);
              if (this.similarityConfig) {
                commentsCreator[quad.subject.value] = [];
              }
            }
          }

          const postDetails = postsDetails[quad.subject.value];
          if (postDetails) {
            postDetails.push(quad);
          }

          if (this.similarityConfig && quad.predicate.equals(termHasCreator)) {
            const pCreator = postsCreator[quad.subject.value];
            const cCreator = commentsCreator[quad.subject.value];
            if (pCreator) {
              pCreator.push(quad.object);
            } else if (cCreator) {
              cCreator.push(quad.object);
            }
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
          ...(this.similarityConfig && { postsCreator, commentsCreator }),
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

  /**
   * Encode interests and university of a person to a semantic one-hot encoded vector
   * @param peopleHasInterest
   * @param peopleStudyAt
   * @param interests
   * @param universities
   * @returns Record mapping person to vector representing their interests
   */
  public interestsToVector(
    peopleHasInterest: Record<string, RDF.NamedNode[]>,
    peopleStudyAt: Record<string, RDF.NamedNode[]>,
    interests: RDF.NamedNode[],
    universities: RDF.NamedNode[],
  ): Record<string, number[]> {
    const indexMapInterests: Record<string, number> = Object.fromEntries(interests.map((s, i) => [ s.value, i ]));
    const indexMapUniversities: Record<string, number> = Object.fromEntries(universities.map((s, i) => [ s.value, i ]));

    const peopleSemanticVectors: Record<string, number[]> = {};
    for (const person of Object.keys(peopleHasInterest)) {
      const semanticVector = <number[]> Array.from({ length: interests.length + universities.length }).fill(0);
      // First n elements semantic vector represent person's interests
      for (const interest of peopleHasInterest[person]) {
        semanticVector[indexMapInterests[interest.value]] = 1;
      }
      // Second m elements semantic vector represent university person studied at
      if (peopleStudyAt[person]) {
        for (const university of peopleStudyAt[person]) {
          semanticVector[indexMapUniversities[university.value] + interests.length] = 1;
        }
      }
      peopleSemanticVectors[person] = semanticVector;
    }
    return peopleSemanticVectors;
  }

  public async peopleSimilarities(
    peopleSemanticVectors: Record<string, number[]>,
    personToPost: Record<string, string[]>,
    personToComment: Record<string, string[]>,
  ): Promise<void> {
    const persons = Object.keys(peopleSemanticVectors);
    let i = 0;
    for (const person of persons) {
      // Transform the person IRI if a transformer is provided
      let personTransformed = person;
      if (this.similarityConfig!.personTransformer) {
        personTransformed = this.similarityConfig!.personTransformer
          .transformTerm(person);
      }
      if (i % 10 === 0) {
        process.stdout.write(`\rSimilarities calculated: ${i}`);
      }
      const similaritiesPeople: IEntitySimilarity[] = [];
      const similaritiesPosts: IEntitySimilarity[] = [];
      const similaritiesComments: IEntitySimilarity[] = [];
      for (const pair of persons) {
        let pairTransformed = pair;
        if (this.similarityConfig!.personTransformer) {
          pairTransformed = this.similarityConfig!.personTransformer.transformTerm(pair);
        }
        if (personTransformed !== pairTransformed) {
          const similarityPerson = this.cosineSimilarity(
            peopleSemanticVectors[person],
            peopleSemanticVectors[pair],
          );
          similaritiesPeople.push(
            {
              entity: pairTransformed,
              similarity: similarityPerson,
            },
          );

          // Add similarity of person to posts of other persons
          if (personToPost[pair]) {
            for (const post of personToPost[pair]) {
              similaritiesPosts.push(
                { entity: post, similarity: similarityPerson },
              );
            }
          }
          if (personToComment[pair]) {
            for (const comment of personToComment[pair]) {
              similaritiesComments.push(
                { entity: comment, similarity: similarityPerson },
              );
            }
          }
        }
      }
      const similaritiesPeopleSorted = this.sortAndTruncateSimilarities(similaritiesPeople);
      const similaritiesPostsSorted = this.sortAndTruncateSimilarities(similaritiesPosts);
      const similaritiesCommentsSorted = this.sortAndTruncateSimilarities(similaritiesComments);

      await this.similarityConfig!.parameterEmitterSimilaritiesPeople.waitForDrain(
        this.similarityConfig!.parameterEmitterSimilaritiesPeople.emitRow(
          [ personTransformed, JSON.stringify(similaritiesPeopleSorted) ],
        ),
      );
      await this.similarityConfig!.parameterEmitterSimilaritiesPosts.waitForDrain(
        this.similarityConfig!.parameterEmitterSimilaritiesPosts.emitRow(
          [ personTransformed, JSON.stringify(similaritiesPostsSorted) ],
        ),
      );
      await this.similarityConfig!.parameterEmitterSimilaritiesComments.waitForDrain(
        this.similarityConfig!.parameterEmitterSimilaritiesComments.emitRow(
          [ personTransformed, JSON.stringify(similaritiesCommentsSorted) ],
        ),
      );
      i++;
    }
    this.similarityConfig!.parameterEmitterSimilaritiesPeople.flush();
    this.similarityConfig!.parameterEmitterSimilaritiesPosts.flush();
    this.similarityConfig!.parameterEmitterSimilaritiesComments.flush();
  }

  public personToActivities(activityToPerson: Record<string, RDF.Term[]>): Record<string, string[]> {
    const personToActivity: Record<string, string[]> = {};
    for (const activity of Object.keys(activityToPerson)) {
      // Guard against activities missing a creator
      if (activityToPerson[activity].length === 0) {
        continue;
      }

      const person = activityToPerson[activity][0].value;
      if (!personToActivity[person]) {
        personToActivity[person] = [];
      }
      personToActivity[person].push(activity);
    }
    return personToActivity;
  }

  public cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return dot / (normA * normB);
  }

  public sortAndTruncateSimilarities(similarityArray: IEntitySimilarity[]): IEntitySimilarity[] {
    // Sort in descending order in terms of similarities
    similarityArray.sort((a, b) => b.similarity - a.similarity);
    // Ensure a maximum number of similarities is stored, as storage is N^2 with
    // N the number of entities.
    const max = this.similarityConfig!.maxSimilarities ?? 200;
    return similarityArray.slice(0, max);
  }
}

export interface IEntitySimilarity {
  entity: string;
  similarity: number;
}

// Avoids Components.js generator flattening the params of this config, to allow this config to be optional.
export class SimilarityConfig implements ISimilarityConfig {
  public constructor(
    public parameterEmitterSimilaritiesPeople: IParameterEmitter,
    public parameterEmitterSimilaritiesPosts: IParameterEmitter,
    public parameterEmitterSimilaritiesComments: IParameterEmitter,
    public maxSimilarities?: number,
    public personTransformer?: TransformerReplaceIri,
  ) {}
}

export interface ISimilarityConfig {
  /**
   * Parameter emitter that emits the calculated similarities for people
   */
  parameterEmitterSimilaritiesPeople: IParameterEmitter;
  /**
   * Parameter emitter that emits the calculated similarities for posts
   */
  parameterEmitterSimilaritiesPosts: IParameterEmitter;
  /**
   * Parameter emitter that emits the calculated similarities for comments
   */
  parameterEmitterSimilaritiesComments: IParameterEmitter;
  /**
   * Maximum number of similarities to save.
   * This will save the highest similarities
   */
  maxSimilarities?: number;
  /**
   * Transformer to replace IRIs in for all people.
   */
  personTransformer?: TransformerReplaceIri;
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
  /**
   * An optional config parameter that if set will make the enhancer
   * output similarities for persons to other entities in the
   * ldbc-snb data.
   */
  similarityConfig?: SimilarityConfig;
}

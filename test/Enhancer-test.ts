import { Readable, PassThrough } from 'node:stream';
import { DataFactory } from 'rdf-data-factory';
import 'jest-rdf';
import { Enhancer, SimilarityConfig } from '../lib/Enhancer';
import type { IEnhancementHandler } from '../lib/handlers/IEnhancementHandler';
import type { IParameterEmitter } from '../lib/parameters/IParameterEmitter';
import { TransformerReplaceIri } from '../lib/transformers/TransformerReplaceIri';
import { DataSelectorSequential } from './selector/DataSelectorSequential';

const streamifyString = require('streamify-string');

const DF = new DataFactory();

const files: Record<string, string> = {};
const writeStream = {
  on: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  end: jest.fn(),
};
jest.mock('node:fs', () => ({
  createReadStream(filePath: string) {
    if (filePath in files) {
      return streamifyString(files[filePath]);
    }
    const ret = new Readable();
    ret._read = () => {
      ret.emit('error', new Error('Unknown file in Enhancer'));
    };
    return ret;
  },
  createWriteStream(_filePath: string) {
    return writeStream;
  },
}));

function createEmitter(): IParameterEmitter {
  return {
    emitHeader: jest.fn(),
    emitRow: jest.fn(() => true),
    flush: jest.fn(),
    waitForDrain: jest.fn(() => Promise.resolve()),
  };
}

describe('Enhancer', () => {
  let enhancer: Enhancer;
  let handlers: IEnhancementHandler[];

  beforeEach(async() => {
    handlers = [
      {
        generate: jest.fn(),
      },
      {
        generate: jest.fn(),
      },
    ];
    enhancer = new Enhancer({
      personsPath: 'source-persons.ttl',
      activitiesPath: 'source-activities.ttl',
      staticPath: 'source-static.ttl',
      destinationPathData: 'destination.ttl',
      dataSelector: new DataSelectorSequential(),
      handlers,
    });
    files['source-persons.ttl'] = `<ex:s> <ex:p> <ex:o>.`;
    files['source-activities.ttl'] = `<ex:s> <ex:p> <ex:o>.`;
    files['source-static.ttl'] = `<ex:s> <ex:p> <ex:o>.`;
  });

  describe('generate', () => {
    beforeEach(() => {
      files['source-persons.ttl'] = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix snvoc: <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/> .
@prefix sn: <http://www.ldbc.eu/ldbc_socialnet/1.0/data/> .
sn:pers00000000000000000933 rdf:type snvoc:Person; snvoc:isLocatedIn sn:city123 .
sn:pers00000000000000001129 rdf:type snvoc:Person; snvoc:isLocatedIn sn:city456 .`;
      files['source-activities.ttl'] = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix snvoc: <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/> .
@prefix sn: <http://www.ldbc.eu/ldbc_socialnet/1.0/data/> .
sn:post00000000618475290624 rdf:type snvoc:Post .
sn:post00000000000000000003 rdf:type snvoc:Post .`;
      files['source-static.ttl'] = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dbpedia-owl: <http://dbpedia.org/ontology/> .
<http://dbpedia.org/resource/Pondicherry> rdf:type dbpedia-owl:City .
<http://dbpedia.org/resource/Rewari> rdf:type dbpedia-owl:City .`;
    });

    it('should run for no handlers', async() => {
      enhancer = new Enhancer({
        personsPath: 'source-persons.ttl',
        activitiesPath: 'source-activities.ttl',
        staticPath: 'source-static.ttl',
        destinationPathData: 'destination.ttl',
        dataSelector: new DataSelectorSequential(),
      });
      await enhancer.generate();
    });

    it('should run all handlers', async() => {
      await enhancer.generate();
      const context = {
        rdfObjectLoader: (<any> enhancer).rdfObjectLoader,
        dataSelector: (<any> enhancer).dataSelector,
        people: [
          expect.anything(),
          expect.anything(),
        ],
        peopleLocatedInCities: {
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000000933': expect.anything(),
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000001129': expect.anything(),
        },
        peopleKnownBy: {},
        peopleKnows: {},
        posts: [
          expect.anything(),
          expect.anything(),
        ],
        postsDetails: {
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000000000000003': expect.anything(),
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000618475290624': expect.anything(),
        },
        comments: [],
        cities: [
          expect.anything(),
          expect.anything(),
        ],
        predicates: [
          DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/isLocatedIn'),
        ],
        classes: [
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Person'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Post'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Comment'),
        ],
      };
      expect(handlers[0].generate).toHaveBeenCalledWith(expect.any(PassThrough), context);
      expect(handlers[1].generate).toHaveBeenCalledWith(expect.any(PassThrough), context);
    });

    it('should run all handlers with a logger', async() => {
      const logger = {
        log: jest.fn(),
      };
      enhancer = new Enhancer({
        personsPath: 'source-persons.ttl',
        activitiesPath: 'source-activities.ttl',
        staticPath: 'source-static.ttl',
        destinationPathData: 'destination.ttl',
        dataSelector: new DataSelectorSequential(),
        handlers,
        logger,
      });

      await enhancer.generate();
      const context = {
        rdfObjectLoader: (<any> enhancer).rdfObjectLoader,
        dataSelector: (<any> enhancer).dataSelector,
        people: [
          expect.anything(),
          expect.anything(),
        ],
        peopleLocatedInCities: {
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000000933': expect.anything(),
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000001129': expect.anything(),
        },
        peopleKnownBy: {},
        peopleKnows: {},
        posts: [
          expect.anything(),
          expect.anything(),
        ],
        postsDetails: {
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000000000000003': expect.anything(),
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000618475290624': expect.anything(),
        },
        comments: [],
        cities: [
          expect.anything(),
          expect.anything(),
        ],
        predicates: [
          DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/isLocatedIn'),
        ],
        classes: [
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Person'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Post'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Comment'),
        ],
      };
      expect(handlers[0].generate).toHaveBeenCalledWith(expect.any(PassThrough), context);
      expect(handlers[1].generate).toHaveBeenCalledWith(expect.any(PassThrough), context);

      expect(logger.log).toHaveBeenCalledTimes(8);
    });
  });

  describe('extractPeople', () => {
    beforeEach(async() => {
      await (<any> enhancer).rdfObjectLoader.context;
    });

    it('should handle a dummy file', async() => {
      await expect(enhancer.extractPeople()).resolves.toEqual({
        people: [],
        peopleLocatedInCities: {},
        peopleKnownBy: {},
        peopleKnows: {},
        predicates: [
          DF.namedNode('ex:p'),
        ],
        personClasses: [],
      });
    });

    it('should handle an empty file', async() => {
      files['source-persons.ttl'] = '';
      await expect(enhancer.extractPeople()).resolves.toEqual({
        people: [],
        peopleLocatedInCities: {},
        peopleKnownBy: {},
        peopleKnows: {},
        predicates: [],
        personClasses: [],
      });
    });

    it('should reject on an erroring stream', async() => {
      delete files['source-persons.ttl'];
      await expect(enhancer.extractPeople()).rejects.toThrow('Unknown file in Enhancer');
    });

    it('should handle a valid file', async() => {
      files['source-persons.ttl'] = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix snvoc: <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/> .
@prefix sn: <http://www.ldbc.eu/ldbc_socialnet/1.0/data/> .
sn:pers00000000000000000933
    rdf:type snvoc:Person ;
    snvoc:id "933"^^xsd:long ;
    snvoc:firstName "Mahinda" ;
    snvoc:lastName "Perera" ;
    snvoc:isLocatedIn sn:city123 ;
    snvoc:gender "male" ;
    snvoc:knows _:b1 .
_:b1 snvoc:hasPerson sn:pers00000000000000001129 .
sn:pers00000000000000000933 snvoc:knows _:b2 .
_:b2 snvoc:hasPerson sn:pers00000000000000001130 .
sn:pers00000000000000001129
    rdf:type snvoc:Person ;
    snvoc:id "1129"^^xsd:long ;
    snvoc:firstName "Carmen" ;
    snvoc:lastName "Lepland" ;
    snvoc:gender "female" ;
    snvoc:isLocatedIn sn:city456 ;
    snvoc:birthday "1984-02-18"^^xsd:date ;
    snvoc:knows _:b3 .
_:b3 snvoc:hasPerson sn:pers00000000000000001130 .
sn:bla rdf:type snvoc:other .`;
      const data = await enhancer.extractPeople();
      expect(data.people).toEqualRdfTermArray([
        DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000000933'),
        DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000001129'),
      ]);
      expect(data.peopleLocatedInCities).toMatchObject({
        'http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000000933':
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/city123'),
        'http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000001129':
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/city456'),
      });
      expect(data.peopleKnownBy).toMatchObject({
        'http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000001129': [
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000000933'),
        ],
        'http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000001130': [
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000000933'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000001129'),
        ],
      });
      expect(data.peopleKnows).toMatchObject({
        'http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000000933': [
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000001129'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000001130'),
        ],
        'http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000001129': [
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000001130'),
        ],
      });
    });
  });

  describe('extractActivities', () => {
    beforeEach(async() => {
      await (<any> enhancer).rdfObjectLoader.context;
    });

    it('should handle a dummy file', async() => {
      await expect(enhancer.extractActivities()).resolves.toEqual({
        posts: [],
        postsDetails: {},
        comments: [],
        activityClasses: [
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Post'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Comment'),
        ],
      });
    });

    it('should handle an empty file', async() => {
      files['source-activities.ttl'] = '';
      await expect(enhancer.extractActivities()).resolves.toEqual({
        posts: [],
        postsDetails: {},
        comments: [],
        activityClasses: [
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Post'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/Comment'),
        ],
      });
    });

    it('should reject on an erroring stream', async() => {
      delete files['source-activities.ttl'];
      await expect(enhancer.extractActivities()).rejects.toThrow('Unknown file in Enhancer');
    });

    it('should handle a valid file', async() => {
      files['source-activities.ttl'] = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix snvoc: <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/> .
@prefix sn: <http://www.ldbc.eu/ldbc_socialnet/1.0/data/> .
sn:post00000000618475290624
    rdf:type snvoc:Post ;
    snvoc:id "618475290624"^^xsd:long ;
    snvoc:creationDate "2011-08-17T06:05:40.595Z"^^xsd:dateTime ;
    snvoc:locationIP "49.246.218.237" ;
    snvoc:browserUsed "Firefox" .
sn:post00000000000000000003
    rdf:type snvoc:Post ;
    snvoc:id "3"^^xsd:long ;
    snvoc:creationDate "2010-02-14T20:30:21.451Z"^^xsd:dateTime .
sn:bla rdf:type snvoc:other .
sn:comm00000000618475290624
    rdf:type snvoc:Comment ;
    snvoc:id "618475290624"^^xsd:long ;
    snvoc:creationDate "2011-08-17T06:05:40.595Z"^^xsd:dateTime ;
    snvoc:locationIP "49.246.218.237" ;
    snvoc:browserUsed "Firefox" .
sn:comm00000000000000000003
    rdf:type snvoc:Comment ;
    snvoc:id "3"^^xsd:long ;
    snvoc:creationDate "2010-02-14T20:30:21.451Z"^^xsd:dateTime .`;
      const { posts, comments } = await enhancer.extractActivities();
      expect(posts).toEqualRdfTermArray([
        DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000618475290624'),
        DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000000000000003'),
      ]);
      expect(comments).toEqualRdfTermArray([
        DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/comm00000000618475290624'),
        DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/comm00000000000000000003'),
      ]);
    });
  });

  describe('extractCities', () => {
    beforeEach(async() => {
      await (<any> enhancer).rdfObjectLoader.context;
    });

    it('should handle a dummy file', async() => {
      await expect(enhancer.extractCities()).resolves.toEqual([]);
    });

    it('should handle an empty file', async() => {
      files['source-static.ttl'] = '';
      await expect(enhancer.extractCities()).resolves.toEqual([]);
    });

    it('should reject on an erroring stream', async() => {
      delete files['source-static.ttl'];
      await expect(enhancer.extractCities()).rejects.toThrow('Unknown file in Enhancer');
    });

    it('should handle a valid file', async() => {
      files['source-static.ttl'] = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dbpedia-owl: <http://dbpedia.org/ontology/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix snvoc: <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/> .
@prefix sn: <http://www.ldbc.eu/ldbc_socialnet/1.0/data/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
<http://dbpedia.org/resource/Pondicherry> rdf:type dbpedia-owl:City .
<http://dbpedia.org/resource/Rewari> rdf:type dbpedia-owl:City .
<http://dbpedia.org/resource/Rewari> foaf:name "Rewari" .
<http://dbpedia.org/resource/Rewari> snvoc:id "112"^^xsd:int .
<http://dbpedia.org/resource/Rewari> snvoc:isPartOf <http://dbpedia.org/resource/India> .
sn:bla rdf:type snvoc:other .`;
      await expect(enhancer.extractCities()).resolves.toEqualRdfTermArray([
        DF.namedNode('http://dbpedia.org/resource/Pondicherry'),
        DF.namedNode('http://dbpedia.org/resource/Rewari'),
      ]);
    });
  });

  describe('with parameter emitters', () => {
    let emitterPosts: IParameterEmitter;
    let emitterComments: IParameterEmitter;

    beforeEach(async() => {
      emitterPosts = {
        emitHeader: jest.fn(),
        emitRow: jest.fn(),
        waitForDrain: jest.fn(),
        flush: jest.fn(),
      };
      emitterComments = {
        emitHeader: jest.fn(),
        emitRow: jest.fn(),
        waitForDrain: jest.fn(),
        flush: jest.fn(),
      };
      enhancer = new Enhancer({
        personsPath: 'source-persons.ttl',
        activitiesPath: 'source-activities.ttl',
        staticPath: 'source-static.ttl',
        destinationPathData: 'destination.ttl',
        dataSelector: new DataSelectorSequential(),
        handlers,
        parameterEmitterPosts: emitterPosts,
        parameterEmitterComments: emitterComments,
      });
    });

    describe('extractActivities', () => {
      beforeEach(async() => {
        await (<any> enhancer).rdfObjectLoader.context;
      });

      it('should handle a valid file', async() => {
        files['source-activities.ttl'] = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix snvoc: <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/> .
@prefix sn: <http://www.ldbc.eu/ldbc_socialnet/1.0/data/> .
sn:post00000000618475290624
    rdf:type snvoc:Post ;
    snvoc:id "618475290624"^^xsd:long ;
    snvoc:creationDate "2011-08-17T06:05:40.595Z"^^xsd:dateTime ;
    snvoc:locationIP "49.246.218.237" ;
    snvoc:browserUsed "Firefox" .
sn:post00000000000000000003
    rdf:type snvoc:Post ;
    snvoc:id "3"^^xsd:long ;
    snvoc:creationDate "2010-02-14T20:30:21.451Z"^^xsd:dateTime .
sn:bla rdf:type snvoc:other .
sn:comm00000000618475290624
    rdf:type snvoc:Comment ;
    snvoc:id "618475290624"^^xsd:long ;
    snvoc:creationDate "2011-08-17T06:05:40.595Z"^^xsd:dateTime ;
    snvoc:locationIP "49.246.218.237" ;
    snvoc:browserUsed "Firefox" .
sn:comm00000000000000000003
    rdf:type snvoc:Comment ;
    snvoc:id "3"^^xsd:long ;
    snvoc:creationDate "2010-02-14T20:30:21.451Z"^^xsd:dateTime .`;
        const { posts, comments } = await enhancer.extractActivities();
        expect(posts).toEqualRdfTermArray([
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000618475290624'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000000000000003'),
        ]);
        expect(comments).toEqualRdfTermArray([
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/comm00000000618475290624'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/comm00000000000000000003'),
        ]);

        expect(emitterPosts.emitHeader).toHaveBeenCalledWith([ 'post' ]);
        expect(emitterPosts.emitRow).toHaveBeenCalledWith([
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000618475290624',
        ]);
        expect(emitterPosts.emitRow).toHaveBeenCalledWith([
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/post00000000000000000003',
        ]);
        expect(emitterPosts.flush).toHaveBeenCalledTimes(1);

        expect(emitterComments.emitHeader).toHaveBeenCalledWith([ 'comment' ]);
        expect(emitterComments.emitRow).toHaveBeenCalledWith([
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/comm00000000618475290624',
        ]);
        expect(emitterComments.emitRow).toHaveBeenCalledWith([
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/comm00000000000000000003',
        ]);
        expect(emitterComments.flush).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('similarity configuration', () => {
    let emitterSimilarityPeople: IParameterEmitter;
    let emitterSimilarityPosts: IParameterEmitter;
    let emitterSimilarityComments: IParameterEmitter;

    beforeEach(() => {
      emitterSimilarityPeople = createEmitter();
      emitterSimilarityPosts = createEmitter();
      emitterSimilarityComments = createEmitter();
    });

    describe('constructor', () => {
      it('should emit required and optional headers when similarityConfig is provided', () => {
        const enhancerSim = new Enhancer({
          personsPath: 'source-persons.ttl',
          activitiesPath: 'source-activities.ttl',
          staticPath: 'source-static.ttl',
          destinationPathData: 'destination.ttl',
          dataSelector: new DataSelectorSequential(),
          similarityConfig: {
            parameterEmitterSimilaritiesPeople: emitterSimilarityPeople,
            parameterEmitterSimilaritiesPosts: emitterSimilarityPosts,
            parameterEmitterSimilaritiesComments: emitterSimilarityComments,
          },
        });

        expect(enhancerSim).toBeInstanceOf(Enhancer);
        expect(emitterSimilarityPeople.emitHeader).toHaveBeenCalledWith([ 'person', 'similarities' ]);
        expect(emitterSimilarityPosts.emitHeader).toHaveBeenCalledWith([ 'person', 'similarities' ]);
        expect(emitterSimilarityComments.emitHeader).toHaveBeenCalledWith([ 'person', 'similarities' ]);
      });
    });

    it('should orchestrate similarity calculations when similarityConfig is provided', async() => {
      const logger = { log: jest.fn() };
      const emitterPeople = createEmitter();
      const emitterPosts = createEmitter();
      const emitterComments = createEmitter();

      enhancer = new Enhancer({
        personsPath: 'source-persons.ttl',
        activitiesPath: 'source-activities.ttl',
        staticPath: 'source-static.ttl',
        destinationPathData: 'destination.ttl',
        dataSelector: new DataSelectorSequential(),
        logger,
        similarityConfig: {
          parameterEmitterSimilaritiesPeople: emitterPeople,
          parameterEmitterSimilaritiesPosts: emitterPosts,
          parameterEmitterSimilaritiesComments: emitterComments,
        },
      });

      // Spy on the methods to verify they are called during generate()
      const personToActivitiesSpy = jest.spyOn(enhancer, 'personToActivities');
      const interestsToVectorSpy = jest.spyOn(enhancer, 'interestsToVector');

      // We mock the implementation of peopleSimilarities here so we are only
      // testing the orchestration block, not re-running the heavy N^2 math
      const peopleSimilaritiesSpy = jest.spyOn(enhancer, 'peopleSimilarities').mockResolvedValue();

      await enhancer.generate();

      // 1. Verify the logger was hit
      expect(logger.log).toHaveBeenCalledWith('Calculating similarities');

      // 2. Verify the data formatting methods were called
      expect(personToActivitiesSpy).toHaveBeenCalledTimes(2);
      expect(interestsToVectorSpy).toHaveBeenCalledTimes(1);

      // 3. Verify the final orchestration method was called with the assembled objects
      expect(peopleSimilaritiesSpy).toHaveBeenCalledTimes(1);
      expect(peopleSimilaritiesSpy).toHaveBeenCalledWith(
        expect.any(Object), // PeopleSemanticVectors
        expect.any(Object), // PersonToPost
        expect.any(Object), // PersonToComment
      );
    });

    describe('helper methods', () => {
      let enhancerSim: Enhancer;
      beforeEach(() => {
        enhancerSim = new Enhancer({
          personsPath: 'source-persons.ttl',
          activitiesPath: 'source-activities.ttl',
          staticPath: 'source-static.ttl',
          destinationPathData: 'destination.ttl',
          dataSelector: new DataSelectorSequential(),
          similarityConfig: {
            parameterEmitterSimilaritiesPeople: emitterSimilarityPeople,
            parameterEmitterSimilaritiesPosts: emitterSimilarityPosts,
            parameterEmitterSimilaritiesComments: emitterSimilarityComments,
            maxSimilarities: 2,
          },
        });
      });

      it('personToActivities should invert activity creators safely', () => {
        expect(
          enhancerSim.personToActivities({
            'post:a': [ DF.namedNode('person:1') ],
            'post:b': [ DF.namedNode('person:1') ],
            'post:c': [ DF.namedNode('person:2') ],
            'post:empty': [],
          }),
        ).toEqual({
          'person:1': [ 'post:a', 'post:b' ],
          'person:2': [ 'post:c' ],
        });
      });

      it('interestsToVector should map interests and universities', () => {
        const peopleSemanticVectors = enhancerSim.interestsToVector(
          {
            person1: [
              DF.namedNode('interest:1'),
              DF.namedNode('interest:2'),
            ],
            person2: [
              DF.namedNode('interest:2'),
            ],
          },
          {
            person1: [
              DF.namedNode('university:1'),
            ],
          },
          [
            DF.namedNode('interest:1'),
            DF.namedNode('interest:2'),
          ],
          [
            DF.namedNode('university:1'),
            DF.namedNode('university:2'),
          ],
        );

        expect(peopleSemanticVectors).toEqual({
          person1: [ 1, 1, 1, 0 ],
          person2: [ 0, 1, 0, 0 ],
        });
      });

      it('cosineSimilarity should calculate similarity', () => {
        expect(enhancerSim.cosineSimilarity([ 1, 1 ], [ 1, 1 ])).toBeCloseTo(1);
        expect(enhancerSim.cosineSimilarity([ 1, 0 ], [ 0, 1 ])).toBe(0);
      });

      it('sortAndTruncateSimilarities should sort and truncate to config max', () => {
        const entries = [
          { entity: 'a', similarity: 0.2 },
          { entity: 'b', similarity: 0.9 },
          { entity: 'c', similarity: 0.7 },
        ];

        expect(enhancerSim.sortAndTruncateSimilarities(entries)).toEqual([
          { entity: 'b', similarity: 0.9 },
          { entity: 'c', similarity: 0.7 },
        ]);
      });
    });

    describe('peopleSimilarities', () => {
      let enhancerSim: Enhancer;

      it('should emit sorted similarities with transformer and truncate by maxSimilarities', async() => {
        const stdoutSpy = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
        const personTransformer = new TransformerReplaceIri('^', 'transformed:');
        const transformSpy = jest.spyOn(personTransformer, 'transformTerm');

        enhancerSim = new Enhancer({
          personsPath: 'source-persons.ttl',
          activitiesPath: 'source-activities.ttl',
          staticPath: 'source-static.ttl',
          destinationPathData: 'destination.ttl',
          dataSelector: new DataSelectorSequential(),
          similarityConfig: {
            maxSimilarities: 1,
            personTransformer,
            parameterEmitterSimilaritiesPeople: emitterSimilarityPeople,
            parameterEmitterSimilaritiesPosts: emitterSimilarityPosts,
            parameterEmitterSimilaritiesComments: emitterSimilarityComments,
          },
        });

        await enhancerSim.peopleSimilarities(
          {
            person1: [ 1, 0 ],
            person2: [ 1, 0 ],
            person3: [ 0, 1 ],
          },
          {
            person2: [ 'post2' ],
            person3: [ 'post3' ],
          },
          {
            person2: [ 'comment2' ],
            person3: [ 'comment3' ],
          },
        );

        expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('Similarities calculated: 0'));
        expect(transformSpy).toHaveBeenCalledWith('person1');
        expect(transformSpy).toHaveBeenCalledWith('person2');

        expect(emitterSimilarityPeople.emitRow).toHaveBeenCalledTimes(3);
        expect(emitterSimilarityPosts.emitRow).toHaveBeenCalledTimes(3);
        expect(emitterSimilarityComments.emitRow).toHaveBeenCalledTimes(3);

        const similaritiesPeopleJson = (<jest.Mock> emitterSimilarityPeople.emitRow).mock.calls[0][0][1];
        const similaritiesPostsJson = (<jest.Mock> emitterSimilarityPosts.emitRow).mock.calls[0][0][1];
        const similaritiesCommentsJson = (<jest.Mock> emitterSimilarityComments.emitRow).mock.calls[0][0][1];

        expect(JSON.parse(similaritiesPeopleJson)).toHaveLength(1);
        expect(JSON.parse(similaritiesPostsJson)).toHaveLength(1);
        expect(JSON.parse(similaritiesCommentsJson)).toHaveLength(1);

        expect(emitterSimilarityPeople.flush).toHaveBeenCalledTimes(1);
        expect(emitterSimilarityPosts.flush).toHaveBeenCalledTimes(1);
        expect(emitterSimilarityComments.flush).toHaveBeenCalledTimes(1);

        stdoutSpy.mockRestore();
      });

      it('should handle a single person without transformer', async() => {
        enhancerSim = new Enhancer({
          personsPath: 'source-persons.ttl',
          activitiesPath: 'source-activities.ttl',
          staticPath: 'source-static.ttl',
          destinationPathData: 'destination.ttl',
          dataSelector: new DataSelectorSequential(),
          similarityConfig: {
            parameterEmitterSimilaritiesPeople: emitterSimilarityPeople,
            parameterEmitterSimilaritiesPosts: emitterSimilarityPosts,
            parameterEmitterSimilaritiesComments: emitterSimilarityComments,
          },
        });

        await enhancerSim.peopleSimilarities(
          {
            person1: [ 1, 0 ],
          },
          {},
          {},
        );

        expect(emitterSimilarityPeople.emitRow).toHaveBeenCalledWith([ 'person1', '[]' ]);
        expect(emitterSimilarityPosts.emitRow).toHaveBeenCalledWith([ 'person1', '[]' ]);
        expect(emitterSimilarityComments.emitRow).toHaveBeenCalledWith([ 'person1', '[]' ]);
      });
    });

    describe('data extraction', () => {
      let enhancerSim: Enhancer;
      beforeEach(async() => {
        enhancerSim = new Enhancer({
          personsPath: 'source-persons.ttl',
          activitiesPath: 'source-activities.ttl',
          staticPath: 'source-static.ttl',
          destinationPathData: 'destination.ttl',
          dataSelector: new DataSelectorSequential(),
          similarityConfig: {
            parameterEmitterSimilaritiesPeople: emitterSimilarityPeople,
            parameterEmitterSimilaritiesPosts: emitterSimilarityPosts,
            parameterEmitterSimilaritiesComments: emitterSimilarityComments,
          },
        });
        await (<any> enhancerSim).rdfObjectLoader.context;
      });

      it('extractPeople should combine standard and similarity extractions', async() => {
        files['source-persons.ttl'] = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix snvoc: <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/> .
@prefix sn: <http://www.ldbc.eu/ldbc_socialnet/1.0/data/> .
sn:person1 rdf:type snvoc:Person ;
  snvoc:isLocatedIn sn:city1 ;
  snvoc:knows _:knows1 ;
  snvoc:hasInterest sn:interest1 ;
  snvoc:studyAt _:study1 .
_:study1 snvoc:hasOrganisation sn:university1 .
_:knows1 snvoc:hasPerson sn:person2 .
sn:person2 rdf:type snvoc:Person ;
  snvoc:hasInterest sn:interest2 .
sn:other rdf:type snvoc:OtherClass .`;

        const data = await enhancerSim.extractPeople();

        expect(data.people).toEqualRdfTermArray([
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/person1'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/person2'),
        ]);
        expect(data.peopleLocatedInCities).toMatchObject({
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/person1': DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/city1'),
        });
        expect(data.peopleKnows).toMatchObject({
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/person1': [
            DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/person2'),
          ],
        });
        expect(data.interests).toEqualRdfTermArray([
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/interest1'),
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/interest2'),
        ]);
        expect(data.universities).toEqualRdfTermArray([
          DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/university1'),
        ]);
        expect(data.peopleHasInterest).toMatchObject({
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/person1': [
            DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/interest1'),
          ],
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/person2': [
            DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/interest2'),
          ],
        });
      });

      it('extractActivities should track creator mappings', async() => {
        files['source-activities.ttl'] = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix snvoc: <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/> .
@prefix sn: <http://www.ldbc.eu/ldbc_socialnet/1.0/data/> .
sn:post1 rdf:type snvoc:Post .
sn:post1 snvoc:hasCreator sn:person1 .
sn:comment1 rdf:type snvoc:Comment .
sn:comment1 snvoc:hasCreator sn:person2 .`;

        const data = await enhancerSim.extractActivities();

        expect(data.postsCreator).toMatchObject({
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/post1': [
            DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/person1'),
          ],
        });
        expect(data.commentsCreator).toMatchObject({
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/comment1': [
            DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/person2'),
          ],
        });
      });
    });
  });
  describe('SimilarityConfig', () => {
    let mockEmitterPeople: IParameterEmitter;
    let mockEmitterPosts: IParameterEmitter;
    let mockEmitterComments: IParameterEmitter;
    let mockTransformer: TransformerReplaceIri;

    beforeEach(() => {
      // Create barebones mock objects that satisfy the TypeScript compiler
      mockEmitterPeople = <IParameterEmitter> {};
      mockEmitterPosts = <IParameterEmitter> {};
      mockEmitterComments = <IParameterEmitter> {};
      mockTransformer = <TransformerReplaceIri> {};
    });

    it('initializes correctly with only the required parameters', () => {
      const config = new SimilarityConfig(
        mockEmitterPeople,
        mockEmitterPosts,
        mockEmitterComments,
      );

      expect(config.parameterEmitterSimilaritiesPeople).toBe(mockEmitterPeople);
      expect(config.parameterEmitterSimilaritiesPosts).toBe(mockEmitterPosts);
      expect(config.parameterEmitterSimilaritiesComments).toBe(mockEmitterComments);

      // Ensure optional parameters remain undefined when not provided
      expect(config.maxSimilarities).toBeUndefined();
      expect(config.personTransformer).toBeUndefined();
    });

    it('initializes correctly with all parameters provided', () => {
      const maxSimilarities = 100;

      const config = new SimilarityConfig(
        mockEmitterPeople,
        mockEmitterPosts,
        mockEmitterComments,
        maxSimilarities,
        mockTransformer,
      );

      expect(config.parameterEmitterSimilaritiesPeople).toBe(mockEmitterPeople);
      expect(config.parameterEmitterSimilaritiesPosts).toBe(mockEmitterPosts);
      expect(config.parameterEmitterSimilaritiesComments).toBe(mockEmitterComments);

      // Ensure optional parameters are properly assigned
      expect(config.maxSimilarities).toBe(maxSimilarities);
      expect(config.personTransformer).toBe(mockTransformer);
    });
  });
});

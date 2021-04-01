import { Readable, PassThrough } from 'stream';
import { DataFactory } from 'rdf-data-factory';
import 'jest-rdf';
import { Enhancer } from '../lib/Enhancer';
import type { IEnhancementHandler } from '../lib/handlers/IEnhancementHandler';
import type { IParameterEmitter } from '../lib/parameters/IParameterEmitter';
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
jest.mock('fs', () => ({
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
  createWriteStream(filePath: string) {
    return writeStream;
  },
}));

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
        comments: [],
        cities: [
          expect.anything(),
          expect.anything(),
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
        comments: [],
        cities: [
          expect.anything(),
          expect.anything(),
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
      expect(await enhancer.extractPeople()).toEqual({
        people: [],
        peopleLocatedInCities: {},
        peopleKnownBy: {},
        peopleKnows: {},
      });
    });

    it('should handle an empty file', async() => {
      files['source-persons.ttl'] = '';
      expect(await enhancer.extractPeople()).toEqual({
        people: [],
        peopleLocatedInCities: {},
        peopleKnownBy: {},
        peopleKnows: {},
      });
    });

    it('should reject on an erroring stream', async() => {
      delete files['source-persons.ttl'];
      await expect(enhancer.extractPeople()).rejects.toThrow();
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
      expect(await enhancer.extractActivities()).toEqual({
        posts: [],
        comments: [],
      });
    });

    it('should handle an empty file', async() => {
      files['source-activities.ttl'] = '';
      expect(await enhancer.extractActivities()).toEqual({
        posts: [],
        comments: [],
      });
    });

    it('should reject on an erroring stream', async() => {
      delete files['source-activities.ttl'];
      await expect(enhancer.extractActivities()).rejects.toThrow();
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
      expect(await enhancer.extractCities()).toEqual([]);
    });

    it('should handle an empty file', async() => {
      files['source-static.ttl'] = '';
      expect(await enhancer.extractCities()).toEqual([]);
    });

    it('should reject on an erroring stream', async() => {
      delete files['source-static.ttl'];
      await expect(enhancer.extractCities()).rejects.toThrow();
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
      expect(await enhancer.extractCities()).toEqualRdfTermArray([
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
        flush: jest.fn(),
      };
      emitterComments = {
        emitHeader: jest.fn(),
        emitRow: jest.fn(),
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
        expect(emitterPosts.flush).toHaveBeenCalled();

        expect(emitterComments.emitHeader).toHaveBeenCalledWith([ 'comment' ]);
        expect(emitterComments.emitRow).toHaveBeenCalledWith([
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/comm00000000618475290624',
        ]);
        expect(emitterComments.emitRow).toHaveBeenCalledWith([
          'http://www.ldbc.eu/ldbc_socialnet/1.0/data/comm00000000000000000003',
        ]);
        expect(emitterComments.flush).toHaveBeenCalled();
      });
    });
  });
});

import { Readable, PassThrough } from 'stream';
import { DataFactory } from 'rdf-data-factory';
import 'jest-rdf';
import { Enhancer } from '../lib/Enhancer';
import type { IEnhancementHandler } from '../lib/handlers/IEnhancementHandler';
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
      personsPath: 'source.ttl',
      destinationPath: 'destination.ttl',
      dataSelector: new DataSelectorSequential(),
      handlers,
    });
    files['source.ttl'] = `<ex:s> <ex:p> <ex:o>.`;
  });

  describe('generate', () => {
    beforeEach(() => {
      files['source.ttl'] = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix snvoc: <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/> .
@prefix sn: <http://www.ldbc.eu/ldbc_socialnet/1.0/data/> .
sn:pers00000000000000000933 rdf:type snvoc:Person .
sn:pers00000000000000001129 rdf:type snvoc:Person .`;
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
      };
      expect(handlers[0].generate).toHaveBeenCalledWith(expect.any(PassThrough), context);
      expect(handlers[1].generate).toHaveBeenCalledWith(expect.any(PassThrough), context);
    });

    it('should run all handlers with a logger', async() => {
      const logger = {
        log: jest.fn(),
      };
      enhancer = new Enhancer({
        personsPath: 'source.ttl',
        destinationPath: 'destination.ttl',
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
      };
      expect(handlers[0].generate).toHaveBeenCalledWith(expect.any(PassThrough), context);
      expect(handlers[1].generate).toHaveBeenCalledWith(expect.any(PassThrough), context);

      expect(logger.log).toHaveBeenCalledTimes(6);
    });
  });

  describe('extractPeople', () => {
    beforeEach(async() => {
      await (<any> enhancer).rdfObjectLoader.context;
    });

    it('should handle a dummy file', async() => {
      expect(await enhancer.extractPeople()).toEqual([]);
    });

    it('should handle an empty file', async() => {
      files['source.ttl'] = '';
      expect(await enhancer.extractPeople()).toEqual([]);
    });

    it('should reject on an erroring stream', async() => {
      delete files['source.ttl'];
      await expect(enhancer.extractPeople()).rejects.toThrow();
    });

    it('should handle a valid file', async() => {
      files['source.ttl'] = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix snvoc: <http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/> .
@prefix sn: <http://www.ldbc.eu/ldbc_socialnet/1.0/data/> .
sn:pers00000000000000000933
    rdf:type snvoc:Person ;
    snvoc:id "933"^^xsd:long ;
    snvoc:firstName "Mahinda" ;
    snvoc:lastName "Perera" ;
    snvoc:gender "male" .
sn:pers00000000000000001129
    rdf:type snvoc:Person ;
    snvoc:id "1129"^^xsd:long ;
    snvoc:firstName "Carmen" ;
    snvoc:lastName "Lepland" ;
    snvoc:gender "female" ;
    snvoc:birthday "1984-02-18"^^xsd:date .
sn:bla rdf:type snvoc:other .`;
      expect(await enhancer.extractPeople()).toEqualRdfTermArray([
        DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000000933'),
        DF.namedNode('http://www.ldbc.eu/ldbc_socialnet/1.0/data/pers00000000000000001129'),
      ]);
    });
  });
});

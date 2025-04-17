import { PassThrough } from 'node:stream';
import { DataFactory } from 'rdf-data-factory';
import { RdfObjectLoader } from 'rdf-object';
import { Enhancer } from '../../lib/Enhancer';
import { EnhancementHandlerPersonNames } from '../../lib/handlers/EnhancementHandlerPersonNames';
import type { IEnhancementContext } from '../../lib/handlers/IEnhancementContext';
import type { IParameterEmitter } from '../../lib/parameters/IParameterEmitter';
import { DataSelectorSequential } from '../selector/DataSelectorSequential';
import 'jest-rdf';

const arrayifyStream = require('arrayify-stream');

const DF = new DataFactory();

describe('EnhancementHandlerPersonNames', () => {
  let handler: EnhancementHandlerPersonNames;
  let stream: PassThrough;
  let rdfObjectLoader: RdfObjectLoader;
  let context: IEnhancementContext;

  beforeEach(async() => {
    handler = new EnhancementHandlerPersonNames(0.5);
    stream = new PassThrough({ objectMode: true });
    rdfObjectLoader = new RdfObjectLoader({ context: Enhancer.CONTEXT_LDBC_SNB });
    context = {
      rdfObjectLoader,
      dataSelector: new DataSelectorSequential(),
      people: [
        DF.namedNode('ex:per1'),
        DF.namedNode('ex:per2'),
        DF.namedNode('ex:per3'),
        DF.namedNode('ex:per4'),
      ],
      peopleLocatedInCities: {
        'ex:per1': DF.namedNode('ex:cit1'),
        'ex:per2': DF.namedNode('ex:cit2'),
        'ex:per3': DF.namedNode('ex:cit3'),
        'ex:per4': DF.namedNode('ex:cit4'),
      },
      peopleKnownBy: {
        'ex:per1': [
          DF.namedNode('ex:per2'),
        ],
        'ex:per4': [
          DF.namedNode('ex:per5'),
        ],
      },
      peopleKnows: {
        'ex:per2': [
          DF.namedNode('ex:per3'),
        ],
        'ex:per5': [
          DF.namedNode('ex:per6'),
        ],
      },
      posts: [],
      postsDetails: {},
      comments: [],
      cities: [
        DF.namedNode('ex:cit1'),
        DF.namedNode('ex:cit2'),
        DF.namedNode('ex:cit3'),
        DF.namedNode('ex:cit4'),
      ],
      predicates: [],
      classes: [],
    };
    await context.rdfObjectLoader.context;
  });

  describe('generate', () => {
    it('should handle for no people', async() => {
      context = { ...context, people: []};
      await handler.generate(stream, context);
      stream.end();
      await expect(arrayifyStream(stream)).resolves.toBeRdfIsomorphic(
        rdfObjectLoader.createCompactedResource({}).toQuads(),
      );
    });

    it('should handle', async() => {
      await handler.generate(stream, context);
      stream.end();
      await expect(arrayifyStream(stream)).resolves.toBeRdfIsomorphic(rdfObjectLoader.createCompactedResources([
        {
          '@id': 'ex:per1',
          type: 'snvoc:Person',
          'snvoc:firstName': '"Zulma"',
          'snvoc:lastName': '"Tulma"',
          'snvoc:hasMaliciousCreator': 'ex:per3',
        },
        {
          '@id': 'ex:per4',
          type: 'snvoc:Person',
          'snvoc:firstName': '"Zulma"',
          'snvoc:lastName': '"Tulma"',
          'snvoc:hasMaliciousCreator': 'ex:per6',
        },
      ]).flatMap(resource => resource.toQuads()));
    });

    it('should handle when peopleKnownBy is empty', async() => {
      context.peopleKnownBy = {};
      await handler.generate(stream, context);
      stream.end();
      await expect(arrayifyStream(stream)).resolves.toBeRdfIsomorphic(rdfObjectLoader.createCompactedResources([])
        .flatMap(resource => resource.toQuads()));
    });

    it('should handle when peopleKnows is empty', async() => {
      context.peopleKnows = {};
      await handler.generate(stream, context);
      stream.end();
      await expect(arrayifyStream(stream)).resolves.toBeRdfIsomorphic(rdfObjectLoader.createCompactedResources([])
        .flatMap(resource => resource.toQuads()));
    });

    it('should not allow person to be the same as malicious creator', async() => {
      context.peopleKnows = {
        'ex:per2': [
          DF.namedNode('ex:per1'),
        ],
        'ex:per5': [
          DF.namedNode('ex:per6'),
        ],
      };

      await handler.generate(stream, context);
      stream.end();
      await expect(arrayifyStream(stream)).resolves.toBeRdfIsomorphic(rdfObjectLoader.createCompactedResources([
        {
          '@id': 'ex:per4',
          type: 'snvoc:Person',
          'snvoc:firstName': '"Zulma"',
          'snvoc:lastName': '"Tulma"',
          'snvoc:hasMaliciousCreator': 'ex:per6',
        },
      ]).flatMap(resource => resource.toQuads()));
    });
  });

  describe('with a parameterEmitter', () => {
    let emitter: IParameterEmitter;

    beforeEach(async() => {
      emitter = {
        emitHeader: jest.fn(),
        emitRow: jest.fn(),
        flush: jest.fn(),
      };
      handler = new EnhancementHandlerPersonNames(0.5, emitter);
    });

    describe('generate', () => {
      it('should handle', async() => {
        await handler.generate(stream, context);

        expect(emitter.emitHeader).toHaveBeenCalledWith([ 'person', 'personMalicious', 'personCommonFriend' ]);
        expect(emitter.emitRow).toHaveBeenCalledWith([ 'ex:per1', 'ex:per3', 'ex:per2' ]);
        expect(emitter.emitRow).toHaveBeenCalledWith([ 'ex:per4', 'ex:per6', 'ex:per5' ]);
        expect(emitter.flush).toHaveBeenCalledTimes(1);
      });
    });
  });
});

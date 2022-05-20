import { PassThrough } from 'stream';
import { DataFactory } from 'rdf-data-factory';
import { RdfObjectLoader } from 'rdf-object';
import { Enhancer } from '../../lib/Enhancer';
import { EnhancementHandlerPersonNoise } from '../../lib/handlers/EnhancementHandlerPersonNoise';
import type { IEnhancementContext } from '../../lib/handlers/IEnhancementContext';
import { DataSelectorSequential } from '../selector/DataSelectorSequential';
import 'jest-rdf';

const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('EnhancementHandlerPersonNoise', () => {
  let handler: EnhancementHandlerPersonNoise;
  let stream: PassThrough;
  let rdfObjectLoader: RdfObjectLoader;
  let context: IEnhancementContext;

  beforeEach(async() => {
    handler = new EnhancementHandlerPersonNoise(0.5);
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
      peopleLocatedInCities: {},
      peopleKnownBy: {},
      peopleKnows: {},
      posts: [],
      comments: [],
      cities: [],
    };
    await context.rdfObjectLoader.context;
  });

  describe('generate', () => {
    it('should handle for no people', async() => {
      context = { ...context, people: []};
      await handler.generate(stream, context);
      stream.end();
      expect(await arrayifyStream(stream)).toBeRdfIsomorphic(rdfObjectLoader.createCompactedResource({}).toQuads());
    });

    it('should handle', async() => {
      await handler.generate(stream, context);
      stream.end();
      expect(await arrayifyStream(stream)).toBeRdfIsomorphic(rdfObjectLoader.createCompactedResources([
        {
          '@id': 'ex:per1-noise-0',
          type: 'snvoc:Noise',
          'snvoc:noise': '"NOISE-0"',
          'snvoc:hasCreator': 'ex:per1',
        },
        {
          '@id': 'ex:per2-noise-1',
          type: 'snvoc:Noise',
          'snvoc:noise': '"NOISE-1"',
          'snvoc:hasCreator': 'ex:per2',
        },
      ]).flatMap(resource => resource.toQuads()));
    });
  });
});

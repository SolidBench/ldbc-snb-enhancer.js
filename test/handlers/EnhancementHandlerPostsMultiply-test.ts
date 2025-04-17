import { PassThrough } from 'node:stream';
import { DataFactory } from 'rdf-data-factory';
import { RdfObjectLoader } from 'rdf-object';
import { Enhancer } from '../../lib/Enhancer';
import { EnhancementHandlerPostsMultiply } from '../../lib/handlers/EnhancementHandlerPostsMultiply';
import type { IEnhancementContext } from '../../lib/handlers/IEnhancementContext';
import { DataSelectorSequential } from '../selector/DataSelectorSequential';
import 'jest-rdf';

const arrayifyStream = require('arrayify-stream');

const DF = new DataFactory();

describe('EnhancementHandlerPostsMultiply', () => {
  let handler: EnhancementHandlerPostsMultiply;
  let stream: PassThrough;
  let rdfObjectLoader: RdfObjectLoader;
  let context: IEnhancementContext;

  beforeEach(async() => {
    handler = new EnhancementHandlerPostsMultiply(2);
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
      posts: [
        DF.namedNode('ex:post001'),
        DF.namedNode('ex:post002'),
        DF.namedNode('ex:post003'),
        DF.namedNode('ex:post004'),
      ],
      postsDetails: {
        'ex:post001': [
          DF.quad(DF.namedNode(''), DF.namedNode('ex:id'), DF.literal('001')),
          DF.quad(DF.namedNode(''), DF.namedNode('ex:content'), DF.literal('content1')),
          DF.quad(DF.namedNode(''), DF.namedNode('ex:other'), DF.literal('other')),
        ],
        'ex:post002': [
          DF.quad(DF.namedNode(''), DF.namedNode('ex:id'), DF.literal('002')),
          DF.quad(DF.namedNode(''), DF.namedNode('ex:content'), DF.literal('content2')),
          DF.quad(DF.namedNode(''), DF.namedNode('ex:other'), DF.literal('other')),
        ],
      },
      comments: [],
      cities: [],
      predicates: [],
      classes: [],
    };
    await context.rdfObjectLoader.context;
  });

  describe('generate', () => {
    it('should handle for no posts', async() => {
      context = { ...context, postsDetails: {}};
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
          '@id': `ex:post001000000`,
          'ex:id': '"001000000"',
          'ex:content': '"content1 COPY 0"',
          'ex:other': '"other"',
        },
        {
          '@id': `ex:post001000001`,
          'ex:id': '"001000001"',
          'ex:content': '"content1 COPY 1"',
          'ex:other': '"other"',
        },
        {
          '@id': `ex:post002000000`,
          'ex:id': '"002000000"',
          'ex:content': '"content2 COPY 0"',
          'ex:other': '"other"',
        },
        {
          '@id': `ex:post002000001`,
          'ex:id': '"002000001"',
          'ex:content': '"content2 COPY 1"',
          'ex:other': '"other"',
        },
      ]).flatMap(resource => resource.toQuads()));
    });
  });
});

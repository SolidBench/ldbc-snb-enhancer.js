import { PassThrough } from 'stream';
import { DataFactory } from 'rdf-data-factory';
import { RdfObjectLoader } from 'rdf-object';
import { Enhancer } from '../../lib/Enhancer';
import { EnhancementHandlerPostContents } from '../../lib/handlers/EnhancementHandlerPostContents';
import type { IEnhancementContext } from '../../lib/handlers/IEnhancementContext';
import { DataSelectorSequential } from '../selector/DataSelectorSequential';
import 'jest-rdf';

const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('EnhancementHandlerPostContents', () => {
  let handler: EnhancementHandlerPostContents;
  let stream: PassThrough;
  let rdfObjectLoader: RdfObjectLoader;
  let context: IEnhancementContext;

  beforeEach(async() => {
    handler = new EnhancementHandlerPostContents(0.5);
    stream = new PassThrough({ objectMode: true });
    rdfObjectLoader = new RdfObjectLoader({ context: Enhancer.CONTEXT_LDBC_SNB });
    context = {
      rdfObjectLoader,
      dataSelector: new DataSelectorSequential(),
      people: [],
      posts: [
        DF.namedNode('ex:p1'),
        DF.namedNode('ex:p2'),
        DF.namedNode('ex:p3'),
        DF.namedNode('ex:p4'),
      ],
    };
    await context.rdfObjectLoader.context;
  });

  describe('generate', () => {
    it('should handle for no posts', async() => {
      context = { ...context, posts: []};
      await handler.generate(stream, context);
      stream.end();
      expect(await arrayifyStream(stream)).toBeRdfIsomorphic(rdfObjectLoader.createCompactedResource({}).toQuads());
    });

    it('should handle', async() => {
      await handler.generate(stream, context);
      stream.end();
      expect(await arrayifyStream(stream)).toBeRdfIsomorphic(rdfObjectLoader.createCompactedResources([
        {
          '@id': `ex:p1`,
          'snvoc:content': '"Tomatoes are blue"^^snvoc:fake',
        },
        {
          '@id': `ex:p2`,
          'snvoc:content': '"Tomatoes are blue"^^snvoc:fake',
        },
      ]).flatMap(resource => resource.toQuads()));
    });
  });
});

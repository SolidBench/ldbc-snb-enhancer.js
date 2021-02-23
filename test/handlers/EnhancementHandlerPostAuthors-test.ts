import { PassThrough } from 'stream';
import { DataFactory } from 'rdf-data-factory';
import { RdfObjectLoader } from 'rdf-object';
import { Enhancer } from '../../lib/Enhancer';
import { EnhancementHandlerPostAuthors } from '../../lib/handlers/EnhancementHandlerPostAuthors';
import type { IEnhancementContext } from '../../lib/handlers/IEnhancementContext';
import { DataSelectorSequential } from '../selector/DataSelectorSequential';
import 'jest-rdf';

const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('EnhancementHandlerPostAuthors', () => {
  let handler: EnhancementHandlerPostAuthors;
  let stream: PassThrough;
  let rdfObjectLoader: RdfObjectLoader;
  let context: IEnhancementContext;

  beforeEach(async() => {
    handler = new EnhancementHandlerPostAuthors(0.5);
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
        DF.namedNode('ex:per5'),
        DF.namedNode('ex:per6'),
      ],
      posts: [
        DF.namedNode('ex:p1'),
        DF.namedNode('ex:p2'),
        DF.namedNode('ex:p3'),
        DF.namedNode('ex:p4'),
        DF.namedNode('ex:p5'),
        DF.namedNode('ex:p6'),
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
          'snvoc:hasCreator': `ex:per2`,
          'snvoc:hasMaliciousCreator': 'ex:per3',
        },
        {
          '@id': `ex:p4`,
          'snvoc:hasCreator': `ex:per5`,
          'snvoc:hasMaliciousCreator': 'ex:per6',
        },
      ]).flatMap(resource => resource.toQuads()));
    });
  });
});

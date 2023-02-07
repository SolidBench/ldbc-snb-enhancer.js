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
      postsDetails: {},
      comments: [],
      cities: [],
      predicates: [],
      classes: [],
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
          '@id': `ex:post001`,
          'snvoc:id': '"1"',
          'snvoc:content': '"Tomatoes are blue"',
          'snvoc:hasMaliciousCreator': 'ex:per2',
        },
        {
          '@id': `ex:post003`,
          'snvoc:id': '"3"',
          'snvoc:content': '"Tomatoes are blue"',
          'snvoc:hasMaliciousCreator': 'ex:per4',
        },
      ]).flatMap(resource => resource.toQuads()));
    });
  });
});

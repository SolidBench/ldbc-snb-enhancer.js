import { PassThrough } from 'stream';
import { DataFactory } from 'rdf-data-factory';
import { RdfObjectLoader } from 'rdf-object';
import { Enhancer } from '../../lib/Enhancer';
import { EnhancementHandlerVocabulary } from '../../lib/handlers/EnhancementHandlerVocabulary';
import type { IEnhancementContext } from '../../lib/handlers/IEnhancementContext';
import { DataSelectorSequential } from '../selector/DataSelectorSequential';
import 'jest-rdf';

const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('EnhancementHandlerVocabulary', () => {
  let handler: EnhancementHandlerVocabulary;
  let stream: PassThrough;
  let rdfObjectLoader: RdfObjectLoader;
  let context: IEnhancementContext;

  beforeEach(async() => {
    handler = new EnhancementHandlerVocabulary();
    stream = new PassThrough({ objectMode: true });
    rdfObjectLoader = new RdfObjectLoader({ context: Enhancer.CONTEXT_LDBC_SNB });
    context = {
      rdfObjectLoader,
      dataSelector: new DataSelectorSequential(),
      people: [],
      peopleLocatedInCities: {},
      peopleKnownBy: {},
      peopleKnows: {},
      posts: [],
      postsDetails: {},
      comments: [],
      cities: [],
      predicates: [
        DF.namedNode('ex:p1'),
        DF.namedNode('ex:p2'),
        DF.namedNode('ex:p3'),
        DF.namedNode('ex:p4'),
      ],
      classes: [
        DF.namedNode('ex:C1'),
        DF.namedNode('ex:C2'),
        DF.namedNode('ex:C3'),
        DF.namedNode('ex:C4'),
      ],
    };
    await context.rdfObjectLoader.context;
  });

  describe('generate', () => {
    it('should handle for no predicates and classes', async() => {
      context = { ...context, predicates: [], classes: []};
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
          type: 'rdf:Property',
        },
        {
          '@id': `ex:p2`,
          type: 'rdf:Property',
        },
        {
          '@id': `ex:p3`,
          type: 'rdf:Property',
        },
        {
          '@id': `ex:p4`,
          type: 'rdf:Property',
        },
        {
          '@id': `ex:C1`,
          type: 'rdfs:Class',
        },
        {
          '@id': `ex:C2`,
          type: 'rdfs:Class',
        },
        {
          '@id': `ex:C3`,
          type: 'rdfs:Class',
        },
        {
          '@id': `ex:C4`,
          type: 'rdfs:Class',
        },
      ]).flatMap(resource => resource.toQuads()));
    });
  });
});

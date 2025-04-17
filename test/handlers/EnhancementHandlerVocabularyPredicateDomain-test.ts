import { PassThrough } from 'node:stream';
import { RdfObjectLoader } from 'rdf-object';
import { Enhancer } from '../../lib/Enhancer';
import { EnhancementHandlerVocabularyPredicateDomain } from
  '../../lib/handlers/EnhancementHandlerVocabularyPredicateDomain';
import type { IEnhancementContext } from '../../lib/handlers/IEnhancementContext';
import { DataSelectorSequential } from '../selector/DataSelectorSequential';
import 'jest-rdf';

const arrayifyStream = require('arrayify-stream');

describe('EnhancementHandlerVocabularyPredicateDomain', () => {
  let handler: EnhancementHandlerVocabularyPredicateDomain;
  let stream: PassThrough;
  let rdfObjectLoader: RdfObjectLoader;
  let context: IEnhancementContext;

  beforeEach(async() => {
    handler = new EnhancementHandlerVocabularyPredicateDomain('ex:class', 'ex:predicate');
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
      predicates: [],
      classes: [],
    };
    await context.rdfObjectLoader.context;
  });

  describe('generate', () => {
    it('should handle', async() => {
      await handler.generate(stream, context);
      stream.end();
      await expect(arrayifyStream(stream)).resolves.toBeRdfIsomorphic(rdfObjectLoader.createCompactedResources([
        {
          '@id': 'ex:predicate',
          'rdfs:domain': 'ex:class',
        },
      ]).flatMap(resource => resource.toQuads()));
    });
  });
});

import { PassThrough } from 'stream';
import { DataFactory } from 'rdf-data-factory';
import { RdfObjectLoader } from 'rdf-object';
import { Enhancer } from '../../lib/Enhancer';
import { EnhancementHandlerPosts } from '../../lib/handlers/EnhancementHandlerPosts';
import type { IEnhancementContext } from '../../lib/handlers/IEnhancementContext';
import { DataSelectorSequential } from '../selector/DataSelectorSequential';
import 'jest-rdf';

const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('EnhancementHandlerPosts', () => {
  let handler: EnhancementHandlerPosts;
  let stream: PassThrough;
  let rdfObjectLoader: RdfObjectLoader;
  let context: IEnhancementContext;

  beforeEach(async() => {
    handler = new EnhancementHandlerPosts(0.5);
    stream = new PassThrough({ objectMode: true });
    rdfObjectLoader = new RdfObjectLoader({ context: Enhancer.CONTEXT_LDBC_SNB });
    context = {
      rdfObjectLoader,
      dataSelector: new DataSelectorSequential(),
      people: [
        DF.namedNode('ex:p1'),
        DF.namedNode('ex:p2'),
        DF.namedNode('ex:p3'),
        DF.namedNode('ex:p4'),
      ],
      peopleLocatedInCities: {},
      peopleKnownBy: {},
      peopleKnows: {},
      posts: [],
      comments: [],
      cities: [],
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
      expect(await arrayifyStream(stream)).toBeRdfIsomorphic(rdfObjectLoader.createCompactedResource({}).toQuads());
    });

    it('should handle', async() => {
      await handler.generate(stream, context);
      stream.end();
      expect(await arrayifyStream(stream)).toBeRdfIsomorphic(rdfObjectLoader.createCompactedResources([
        {
          '@id': `sn:post-fake0`,
          type: 'snvoc:Post',
          'snvoc:id': 0,
          'snvoc:hasCreator': 'ex:p1',
          'snvoc:hasMaliciousCreator': 'ex:p2',
          'snvoc:creationDate': '"2021-02-22T10:39:31.595Z"',
          'snvoc:locationIP': '"200.200.200.200"',
          'snvoc:browserUsed': '"Firefox"',
          'snvoc:content': '"Tomatoes are blue"',
          'snvoc:length': '"17"',
          'snvoc:language': '"en"',
          'snvoc:locatedIn': 'http://dbpedia.org/resource/Belgium',
          'snvoc:hasTag': 'http://www.ldbc.eu/ldbc_socialnet/1.0/tag/Georges_Bizet',
        },
        {
          '@id': `sn:post-fake1`,
          type: 'snvoc:Post',
          'snvoc:id': 1,
          'snvoc:hasCreator': 'ex:p3',
          'snvoc:hasMaliciousCreator': 'ex:p4',
          'snvoc:creationDate': '"2021-02-22T10:39:31.595Z"',
          'snvoc:locationIP': '"200.200.200.200"',
          'snvoc:browserUsed': '"Firefox"',
          'snvoc:content': '"Tomatoes are blue"',
          'snvoc:length': '"17"',
          'snvoc:language': '"en"',
          'snvoc:locatedIn': 'http://dbpedia.org/resource/Belgium',
          'snvoc:hasTag': 'http://www.ldbc.eu/ldbc_socialnet/1.0/tag/Georges_Bizet',
        },
      ]).flatMap(resource => resource.toQuads()));
    });
  });
});

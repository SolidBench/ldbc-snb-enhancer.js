import { PassThrough } from 'stream';
import { DataFactory } from 'rdf-data-factory';
import { RdfObjectLoader } from 'rdf-object';
import { Enhancer } from '../../lib/Enhancer';
import { EnhancementHandlerComments } from '../../lib/handlers/EnhancementHandlerComments';
import type { IEnhancementContext } from '../../lib/handlers/IEnhancementContext';
import { DataSelectorSequential } from '../selector/DataSelectorSequential';
import 'jest-rdf';

const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('EnhancementHandlerComments', () => {
  let handler: EnhancementHandlerComments;
  let stream: PassThrough;
  let rdfObjectLoader: RdfObjectLoader;
  let context: IEnhancementContext;

  beforeEach(async() => {
    handler = new EnhancementHandlerComments(0.5);
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
        DF.namedNode('ex:post001'),
        DF.namedNode('ex:post002'),
        DF.namedNode('ex:post003'),
        DF.namedNode('ex:post004'),
        DF.namedNode('ex:post005'),
        DF.namedNode('ex:post006'),
      ],
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
          '@id': `sn:comment-fake0`,
          type: 'snvoc:Comment',
          'snvoc:id': 0,
          'snvoc:hasCreator': 'ex:per1',
          'snvoc:hasMaliciousCreator': 'ex:per2',
          'snvoc:creationDate': '"2021-02-22T10:39:31.595Z"',
          'snvoc:locationIP': '"200.200.200.200"',
          'snvoc:browserUsed': '"Firefox"',
          'snvoc:content': '"Tomatoes are blue"',
          'snvoc:length': '"17"',
          'snvoc:replyOf': 'ex:post003',
          'snvoc:language': '"en"',
          'snvoc:locatedIn': 'http://dbpedia.org/resource/Belgium',
          'snvoc:hasTag': 'http://www.ldbc.eu/ldbc_socialnet/1.0/tag/Georges_Bizet',
        },
        {
          '@id': `sn:comment-fake1`,
          type: 'snvoc:Comment',
          'snvoc:id': 1,
          'snvoc:hasCreator': 'ex:per4',
          'snvoc:hasMaliciousCreator': 'ex:per5',
          'snvoc:creationDate': '"2021-02-22T10:39:31.595Z"',
          'snvoc:locationIP': '"200.200.200.200"',
          'snvoc:browserUsed': '"Firefox"',
          'snvoc:content': '"Tomatoes are blue"',
          'snvoc:length': '"17"',
          'snvoc:replyOf': 'ex:post006',
          'snvoc:language': '"en"',
          'snvoc:locatedIn': 'http://dbpedia.org/resource/Belgium',
          'snvoc:hasTag': 'http://www.ldbc.eu/ldbc_socialnet/1.0/tag/Georges_Bizet',
        },
        {
          '@id': `sn:comment-fake2`,
          type: 'snvoc:Comment',
          'snvoc:id': 2,
          'snvoc:hasCreator': 'ex:per1',
          'snvoc:hasMaliciousCreator': 'ex:per2',
          'snvoc:creationDate': '"2021-02-22T10:39:31.595Z"',
          'snvoc:locationIP': '"200.200.200.200"',
          'snvoc:browserUsed': '"Firefox"',
          'snvoc:content': '"Tomatoes are blue"',
          'snvoc:length': '"17"',
          'snvoc:replyOf': 'ex:post003',
          'snvoc:language': '"en"',
          'snvoc:locatedIn': 'http://dbpedia.org/resource/Belgium',
          'snvoc:hasTag': 'http://www.ldbc.eu/ldbc_socialnet/1.0/tag/Georges_Bizet',
        },
      ]).flatMap(resource => resource.toQuads()));
    });
  });
});

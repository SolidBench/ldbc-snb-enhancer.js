import { PassThrough } from 'node:stream';
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
      peopleLocatedInCities: {},
      peopleKnownBy: {},
      peopleKnows: {},
      posts: [
        DF.namedNode('ex:post001'),
        DF.namedNode('ex:post002'),
        DF.namedNode('ex:post003'),
        DF.namedNode('ex:post004'),
        DF.namedNode('ex:post005'),
        DF.namedNode('ex:post006'),
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
      await expect(arrayifyStream(stream)).resolves.toBeRdfIsomorphic(
        rdfObjectLoader.createCompactedResource({}).toQuads(),
      );
    });

    it('should handle', async() => {
      await handler.generate(stream, context);
      stream.end();
      await expect(arrayifyStream(stream)).resolves.toBeRdfIsomorphic(rdfObjectLoader.createCompactedResources([
        {
          '@id': `ex:post001`,
          'snvoc:id': '"1"',
          'snvoc:hasCreator': `ex:per2`,
          'snvoc:hasMaliciousCreator': 'ex:per3',
        },
        {
          '@id': `ex:post004`,
          'snvoc:id': '"4"',
          'snvoc:hasCreator': `ex:per5`,
          'snvoc:hasMaliciousCreator': 'ex:per6',
        },
      ]).flatMap(resource => resource.toQuads()));
    });
  });
});

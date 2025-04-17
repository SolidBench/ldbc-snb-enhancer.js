import type { Writable } from 'node:stream';
import type * as RDF from '@rdfjs/types';
import { writeSafe } from './EnhancementHandlerUtils';
import type { IEnhancementContext } from './IEnhancementContext';
import type { IEnhancementHandler } from './IEnhancementHandler';

/**
 * Generate comments and assign them to existing people as reply to existing posts.
 */
export class EnhancementHandlerComments implements IEnhancementHandler {
  private readonly chance: number;

  /**
   * @param chance The chance for comments to be generated.
   *               The number of comments will be the number of people times this chance,
   *               where people are randomly assigned to comments. @range {double}
   */
  public constructor(chance: number) {
    this.chance = chance;
  }

  public async generate(writeStream: RDF.Stream & Writable, context: IEnhancementContext): Promise<void> {
    const postCount = this.chance * context.people.length;
    for (let i = 0; i < postCount; i++) {
      const person = context.dataSelector.selectArrayElement(context.people);
      const personMalicious = context.dataSelector.selectArrayElement(context.people);
      const post = context.dataSelector.selectArrayElement(context.posts);
      const resource = context.rdfObjectLoader.createCompactedResource({
        /* eslint-disable ts/naming-convention */
        '@id': `sn:comment-fake${i}`,
        type: 'snvoc:Comment',
        'snvoc:id': i,
        'snvoc:hasCreator': person,
        'snvoc:hasMaliciousCreator': personMalicious,
        'snvoc:creationDate': '"2021-02-22T10:39:31.595Z"',
        'snvoc:locationIP': '"200.200.200.200"',
        'snvoc:browserUsed': '"Firefox"',
        'snvoc:content': '"Tomatoes are blue"',
        'snvoc:length': '"17"',
        'snvoc:replyOf': post,
        'snvoc:language': '"en"',
        'snvoc:locatedIn': 'http://dbpedia.org/resource/Belgium',
        'snvoc:hasTag': 'http://www.ldbc.eu/ldbc_socialnet/1.0/tag/Georges_Bizet',
        /* eslint-enable ts/naming-convention */
      });
      for (const quad of resource.toQuads()) {
        await writeSafe(writeStream, quad);
      }
    }
  }
}

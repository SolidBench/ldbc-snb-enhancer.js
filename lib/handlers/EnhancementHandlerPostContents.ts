import type { Writable } from 'stream';
import type * as RDF from 'rdf-js';
import type { IEnhancementContext } from './IEnhancementContext';
import type { IEnhancementHandler } from './IEnhancementHandler';

/**
 * Generate additional contents for existing posts.
 */
export class EnhancementHandlerPostContents implements IEnhancementHandler {
  private readonly chance: number;

  /**
   * @param chance The chance for post content to be generated.
   *               The number of new post contents will be the number of posts times this chance,
   *               where contents are randomly assigned to posts. @range {double}
   */
  public constructor(chance: number) {
    this.chance = chance;
  }

  public async generate(writeStream: RDF.Stream & Writable, context: IEnhancementContext): Promise<void> {
    const contentLength = this.chance * context.posts.length;
    for (let i = 0; i < contentLength; i++) {
      const post = context.dataSelector.selectArrayElement(context.posts);
      const personMalicious = context.dataSelector.selectArrayElement(context.people);
      const resource = context.rdfObjectLoader.createCompactedResource({
        '@id': post.value,
        'snvoc:content': '"Tomatoes are blue"',
        'snvoc:hasMaliciousCreator': personMalicious,
      });
      for (const quad of resource.toQuads()) {
        writeStream.write(quad);
      }
    }
  }
}

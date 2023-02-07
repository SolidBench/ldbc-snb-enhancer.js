import type { Writable } from 'stream';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { IEnhancementContext } from './IEnhancementContext';
import type { IEnhancementHandler } from './IEnhancementHandler';

const DF = new DataFactory();

/**
 * Multiply the number of posts with a given amount.
 */
export class EnhancementHandlerPostsMultiply implements IEnhancementHandler {
  private readonly factor: number;

  /**
   * @param factor The number of posts to multiply.
   */
  public constructor(factor: number) {
    this.factor = factor;
  }

  public async generate(writeStream: RDF.Stream & Writable, context: IEnhancementContext): Promise<void> {
    for (const [ subject, quads ] of Object.entries(context.postsDetails)) {
      for (let i = 0; i < this.factor; i++) {
        const subjectThis = DF.namedNode(`${subject}00000${i}`);
        for (const quad of quads) {
          let value = quad.object;
          if (quad.predicate.value.endsWith('id')) {
            value = DF.literal(`${value.value}00000${i}`);
          } else if (quad.predicate.value.endsWith('content')) {
            value = DF.literal(`${value.value} COPY ${i}`);
          }
          writeStream.write(DF.quad(
            subjectThis,
            quad.predicate,
            value,
            quad.graph,
          ));
        }
      }
    }
  }
}

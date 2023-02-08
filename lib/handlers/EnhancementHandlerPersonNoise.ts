import type { Writable } from 'stream';
import type * as RDF from '@rdfjs/types';
import { writeSafe } from './EnhancementHandlerUtils';
import type { IEnhancementContext } from './IEnhancementContext';
import type { IEnhancementHandler } from './IEnhancementHandler';

/**
 * Generate noisy data for existing people.
 * People are selected randomly.
 */
export class EnhancementHandlerPersonNoise implements IEnhancementHandler {
  private readonly chance: number;

  /**
   * @param chance The chance for an additional triple to be generated.
   *               The number of new triples will be the number of people times this chance.
   *               This value can be larger than 1 to generate multiple triples per person. @range {double}
   */
  public constructor(chance: number) {
    this.chance = chance;
  }

  public async generate(writeStream: RDF.Stream & Writable, context: IEnhancementContext): Promise<void> {
    const namesLength = this.chance * context.people.length;
    for (let i = 0; i < namesLength; i++) {
      // Determine people
      const person = context.dataSelector.selectArrayElement(context.people);

      // Create resource
      const resource = context.rdfObjectLoader.createCompactedResource({
        '@id': `${person.value}-noise-${i}`,
        type: 'snvoc:Noise',
        'snvoc:noise': `"NOISE-${i}"`,
        'snvoc:hasCreator': person.value,
      });
      for (const quad of resource.toQuads(undefined, undefined, { [person.value]: true })) {
        await writeSafe(writeStream, quad);
      }
    }
  }
}

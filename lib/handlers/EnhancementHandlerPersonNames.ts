import type { Writable } from 'stream';
import type * as RDF from 'rdf-js';
import type { IEnhancementContext } from './IEnhancementContext';
import type { IEnhancementHandler } from './IEnhancementHandler';

/**
 * Generate additional names for existing people.
 */
export class EnhancementHandlerPersonNames implements IEnhancementHandler {
  private readonly chance: number;

  /**
   * @param chance The chance for a name to be generated.
   *               The number of new names will be the number of people times this chance,
   *               where names are randomly assigned to names. @range {double}
   */
  public constructor(chance: number) {
    this.chance = chance;
  }

  public async generate(writeStream: RDF.Stream & Writable, context: IEnhancementContext): Promise<void> {
    const namesLength = this.chance * context.people.length;
    for (let i = 0; i < namesLength; i++) {
      const person = context.dataSelector.selectArrayElement(context.people);
      const personMalicious = context.dataSelector.selectArrayElement(context.people);
      const resource = context.rdfObjectLoader.createCompactedResource({
        '@id': person.value,
        'snvoc:firstName': '"Zulma"',
        'snvoc:lastName': '"Tulma"',
        'snvoc:hasMaliciousCreator': personMalicious,
      });
      for (const quad of resource.toQuads()) {
        writeStream.write(quad);
      }
    }
  }
}

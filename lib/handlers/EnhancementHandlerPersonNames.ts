import type { Writable } from 'stream';
import type * as RDF from 'rdf-js';
import type { IEnhancementContext } from './IEnhancementContext';
import type { IEnhancementHandler } from './IEnhancementHandler';

/**
 * Generate additional names for existing people.
 * People are selected randomly from the friends that are known by the given person.
 */
export class EnhancementHandlerPersonNames implements IEnhancementHandler {
  private readonly chance: number;
  private readonly definedByCity: boolean;

  /**
   * @param chance The chance for a name to be generated.
   *               The number of new names will be the number of people times this chance,
   *               where names are randomly assigned to names. @range {double}
   * @param definedByCity Optional parameter to indicate if the snvoc:hasMaliciousCreator predicate
   *                      should refer to a city instead of a person. (defaults to false)
   *                      If enabled, cities will be selected based on the city the random person is located in.
   */
  public constructor(chance: number, definedByCity = false) {
    this.chance = chance;
    this.definedByCity = definedByCity;
  }

  protected getMaliciousPerson(person: RDF.NamedNode, context: IEnhancementContext): RDF.NamedNode | undefined {
    if (this.definedByCity) {
      return context.peopleLocatedInCities[person.value];
    }

    const knownByArray = context.peopleKnownBy[person.value];
    if (!knownByArray) {
      return;
    }
    const knownBy = context.dataSelector.selectArrayElement(knownByArray);
    const knowsArray = context.peopleKnows[knownBy.value];
    if (!knowsArray) {
      return;
    }
    return context.dataSelector.selectArrayElement(knowsArray);
  }

  public async generate(writeStream: RDF.Stream & Writable, context: IEnhancementContext): Promise<void> {
    const namesLength = this.chance * context.people.length;
    for (let i = 0; i < namesLength; i++) {
      const person = context.dataSelector.selectArrayElement(context.people);
      const personMalicious = this.getMaliciousPerson(person, context);
      if (!personMalicious || personMalicious.equals(person)) {
        continue;
      }
      const resource = context.rdfObjectLoader.createCompactedResource({
        '@id': person.value,
        type: 'snvoc:Person',
        'snvoc:firstName': '"Zulma"',
        'snvoc:lastName': '"Tulma"',
        'snvoc:hasMaliciousCreator': personMalicious,
      });
      for (const quad of resource.toQuads(undefined, undefined, { [personMalicious.value]: true })) {
        writeStream.write(quad);
      }
    }
  }
}

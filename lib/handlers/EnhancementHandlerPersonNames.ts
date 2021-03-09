import type { Writable } from 'stream';
import type * as RDF from 'rdf-js';
import type { IParameterEmitter } from '../parameters/IParameterEmitter';
import type { IEnhancementContext } from './IEnhancementContext';
import type { IEnhancementHandler } from './IEnhancementHandler';

/**
 * Generate additional names for existing people.
 * People are selected randomly from the friends that are known by the given person.
 */
export class EnhancementHandlerPersonNames implements IEnhancementHandler {
  private readonly chance: number;
  private readonly parameterEmitter?: IParameterEmitter;

  /**
   * @param chance The chance for a name to be generated.
   *               The number of new names will be the number of people times this chance,
   *               where names are randomly assigned to names. @range {double}
   * @param parameterEmitter An optional parameter emitter.
   */
  public constructor(chance: number, parameterEmitter?: IParameterEmitter) {
    this.chance = chance;
    this.parameterEmitter = parameterEmitter;
    this.parameterEmitter?.emitHeader([ 'person', 'personMalicious', 'personCommonFriend' ]);
  }

  protected getMaliciousData(person: RDF.NamedNode, context: IEnhancementContext):
  { personMalicious: RDF.NamedNode; personCommonFriend: RDF.NamedNode } | undefined {
    const knownByArray = context.peopleKnownBy[person.value];
    if (!knownByArray) {
      return;
    }
    const knownBy = context.dataSelector.selectArrayElement(knownByArray);
    const knowsArray = context.peopleKnows[knownBy.value];
    if (!knowsArray) {
      return;
    }
    return {
      personMalicious: context.dataSelector.selectArrayElement(knowsArray),
      personCommonFriend: knownBy,
    };
  }

  public async generate(writeStream: RDF.Stream & Writable, context: IEnhancementContext): Promise<void> {
    const namesLength = this.chance * context.people.length;
    for (let i = 0; i < namesLength; i++) {
      // Determine people
      const person = context.dataSelector.selectArrayElement(context.people);
      const maliciousData = this.getMaliciousData(person, context);
      if (!maliciousData || maliciousData.personMalicious.equals(person)) {
        continue;
      }
      const { personMalicious, personCommonFriend } = maliciousData;

      // Create resource
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

      // Emit parameters
      this.parameterEmitter?.emitRow([
        person.value,
        personMalicious.value,
        personCommonFriend.value,
      ]);
    }

    this.parameterEmitter?.flush();
  }
}

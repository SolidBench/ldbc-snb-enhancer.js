import type { Writable } from 'node:stream';
import type * as RDF from '@rdfjs/types';
import type { IParameterEmitter } from '../parameters/IParameterEmitter';
import { writeSafe } from './EnhancementHandlerUtils';
import type { IEnhancementContext } from './IEnhancementContext';
import type { IEnhancementHandler } from './IEnhancementHandler';

/**
 * Generate additional names for existing people where the malicious creator refers to a city.
 * Cities will be selected based on the city the random person is located in.
 */
export class EnhancementHandlerPersonNamesCities implements IEnhancementHandler {
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
    this.parameterEmitter?.emitHeader([ 'person', 'cityMalicious' ]);
  }

  public async generate(writeStream: RDF.Stream & Writable, context: IEnhancementContext): Promise<void> {
    const namesLength = this.chance * context.people.length;
    for (let i = 0; i < namesLength; i++) {
      // Determine people
      const person = context.dataSelector.selectArrayElement(context.people);
      const cityMalicious = context.peopleLocatedInCities[person.value];
      if (!cityMalicious) {
        continue;
      }

      // Create resource
      const resource = context.rdfObjectLoader.createCompactedResource({
        /* eslint-disable ts/naming-convention */
        '@id': person.value,
        type: 'snvoc:Person',
        'snvoc:firstName': '"Zulma"',
        'snvoc:lastName': '"Tulma"',
        'snvoc:hasMaliciousCreator': cityMalicious,
        /* eslint-enable ts/naming-convention */
      });
      for (const quad of resource.toQuads(undefined, undefined, { [cityMalicious.value]: true })) {
        await writeSafe(writeStream, quad);
      }

      // Emit parameters
      this.parameterEmitter?.emitRow([
        person.value,
        cityMalicious.value,
      ]);
    }

    this.parameterEmitter?.flush();
  }
}

import type { Writable } from 'node:stream';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { writeSafe } from './EnhancementHandlerUtils';
import type { IEnhancementContext } from './IEnhancementContext';
import type { IEnhancementHandler } from './IEnhancementHandler';

const DF = new DataFactory();

/**
 * Generates vocabulary information.
 */
export class EnhancementHandlerVocabulary implements IEnhancementHandler {
  public async generate(writeStream: RDF.Stream & Writable, context: IEnhancementContext): Promise<void> {
    const rdfType = DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    const rdfsProperty = DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#Property');
    const rdfsClass = DF.namedNode('http://www.w3.org/2000/01/rdf-schema#Class');

    // Write predicates
    for (const predicate of context.predicates) {
      await writeSafe(writeStream, DF.quad(predicate, rdfType, rdfsProperty));
    }
    // Write classes
    for (const clazz of context.classes) {
      await writeSafe(writeStream, DF.quad(clazz, rdfType, rdfsClass));
    }
  }
}

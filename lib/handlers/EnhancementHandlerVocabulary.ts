import type { Writable } from 'stream';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { IEnhancementContext } from './IEnhancementContext';
import type { IEnhancementHandler } from './IEnhancementHandler';

const DF = new DataFactory();

/**
 * Generates vocabulary information.
 */
export class EnhancementHandlerVocabulary implements IEnhancementHandler {
  public async generate(writeStream: RDF.Stream & Writable, context: IEnhancementContext): Promise<void> {
    const rdf_type = DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    const rdfs_property = DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#Property');
    const rdfs_class = DF.namedNode('http://www.w3.org/2000/01/rdf-schema#Class');

    // Write predicates
    for (const predicate of context.predicates) {
      writeStream.write(DF.quad(predicate, rdf_type, rdfs_property));
    }
    // Write classes
    for (const clazz of context.classes) {
      writeStream.write(DF.quad(clazz, rdf_type, rdfs_class));
    }
  }
}

import type { Writable } from 'node:stream';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { writeSafe } from './EnhancementHandlerUtils';
import type { IEnhancementContext } from './IEnhancementContext';
import type { IEnhancementHandler } from './IEnhancementHandler';

const DF = new DataFactory();

/**
 * Generates vocabulary information about the domain of a specific predicate
 */
export class EnhancementHandlerVocabularyPredicateDomain implements IEnhancementHandler {
  private readonly classIRI: string;
  private readonly predicateIRI: string;

  /**
   * @param classIRI class that is domain for the given predicate
   * @param predicateIRI predicate to be associated with the class
   */
  public constructor(classIRI: string, predicateIRI: string) {
    this.classIRI = classIRI;
    this.predicateIRI = predicateIRI;
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  public async generate(writeStream: RDF.Stream & Writable, context: IEnhancementContext): Promise<void> {
    const rdfPredicate = DF.namedNode(this.predicateIRI);
    const rdfsDomain = DF.namedNode('http://www.w3.org/2000/01/rdf-schema#domain');
    const rdfsClass = DF.namedNode(this.classIRI);

    await writeSafe(writeStream, DF.quad(rdfPredicate, rdfsDomain, rdfsClass));
  }
}

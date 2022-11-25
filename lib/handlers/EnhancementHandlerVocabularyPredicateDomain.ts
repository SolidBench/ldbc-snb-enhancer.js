import type { Writable } from 'stream';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { IEnhancementContext } from './IEnhancementContext';
import type { IEnhancementHandler } from './IEnhancementHandler';

const DF = new DataFactory();

/**
 * Generates vocabulary domain information.
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

  public async generate(writeStream: RDF.Stream & Writable, context: IEnhancementContext): Promise<void> {
    const rdf_predicate = DF.namedNode(this.predicateIRI);
    const rdfs_domain = DF.namedNode('http://www.w3.org/2000/01/rdf-schema#domain');
    const rdfs_class = DF.namedNode(this.classIRI);

    writeStream.write(DF.quad(rdf_predicate, rdfs_domain, rdfs_class));
  }
}

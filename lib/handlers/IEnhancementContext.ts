import type * as RDF from 'rdf-js';
import type { RdfObjectLoader } from 'rdf-object';
import type { IDataSelector } from '../selector/IDataSelector';

/**
 * Holds background knowledge of the dataset to enhance.
 */
export interface IEnhancementContext {
  /**
   * Object loader utility.
   */
  rdfObjectLoader: RdfObjectLoader;
  /**
   * Utility for selecting data.
   */
  dataSelector: IDataSelector;

  /**
   * An array of IRIs of all people in the dataset.
   */
  people: RDF.NamedNode[];
}

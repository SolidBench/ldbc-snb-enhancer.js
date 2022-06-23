import type * as RDF from '@rdfjs/types';
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
  /**
   * A mapping of people and the city they are located in.
   */
  peopleLocatedInCities: Record<string, RDF.NamedNode>;
  /**
   * A mapping of people to people they know.
   */
  peopleKnows: Record<string, RDF.NamedNode[]>;
  /**
   * A mapping of people to people they know by.
   */
  peopleKnownBy: Record<string, RDF.NamedNode[]>;
  /**
   * An array of IRIs of all posts in the dataset.
   */
  posts: RDF.NamedNode[];
  /**
   * An array of IRIs of all comments in the dataset.
   */
  comments: RDF.NamedNode[];
  /**
   * An array of IRIs of all cities in the dataset.
   */
  cities: RDF.NamedNode[];
  /**
   * An array of all predicates.
   */
  predicates: RDF.NamedNode[];
  /**
   * An array of all classes.
   */
  classes: RDF.NamedNode[];
}

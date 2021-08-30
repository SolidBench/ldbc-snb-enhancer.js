import type { Writable } from 'stream';
import type * as RDF from '@rdfjs/types';
import type { IEnhancementContext } from './IEnhancementContext';

/**
 * Generates quads based on a given set of people.
 */
export interface IEnhancementHandler {
  generate: (writeStream: RDF.Stream & Writable, context: IEnhancementContext) => Promise<void>;
}

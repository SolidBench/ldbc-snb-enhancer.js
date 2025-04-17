import type { Writable } from 'node:stream';
import type * as RDF from '@rdfjs/types';

export async function writeSafe(writeStream: RDF.Stream & Writable, quad: RDF.BaseQuad): Promise<void> {
  if (!writeStream.write(quad)) {
    await new Promise(resolve => writeStream.once('drain', resolve));
  }
}

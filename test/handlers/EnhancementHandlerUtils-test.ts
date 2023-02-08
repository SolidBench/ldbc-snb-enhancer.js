import { PassThrough } from 'stream';
import { DataFactory } from 'rdf-data-factory';
import { writeSafe } from '../../lib/handlers/EnhancementHandlerUtils';

const DF = new DataFactory();
const quad = DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'));

describe('EnhancementHandlerUtils', () => {
  describe('writeSafe', () => {
    it('should handle a stream that is directly writable', async() => {
      const stream = new PassThrough({ objectMode: true });
      jest.spyOn(stream, 'once');
      await writeSafe(stream, quad);
      expect(stream.once).not.toHaveBeenCalled();
    });

    it('should await drain if a stream is not directly writable', async() => {
      const stream = new PassThrough({ objectMode: true });
      stream.write = () => false;
      jest.spyOn(stream, 'once');
      const promise = writeSafe(stream, quad);
      stream.emit('drain');
      await promise;
      expect(stream.once).toHaveBeenCalled();
    });
  });
});

/**
 * Emits parameters in a tabular structure.
 */
export interface IParameterEmitter {
  emitHeader: (columnNames: string[]) => void;
  emitRow: (columns: string[]) => void;
  flush: () => void;
}

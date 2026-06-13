export type DiffRow = {
  oldLine?: number;
  newLine?: number;
  oldText?: string;
  newText?: string;
  type: 'context' | 'add' | 'del' | 'modify';
};

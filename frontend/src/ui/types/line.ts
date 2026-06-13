export type Line = {
  type: 'add' | 'del' | 'context';
  content: string;
  lineNumber: number;
};
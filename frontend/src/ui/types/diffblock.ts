import { DiffRow } from "./diffrows";

export type DiffBlock =
  | {
      kind: 'rows';
      rows: DiffRow[];
    }
  | {
      kind: 'collapsed';
      id: string;
      count: number;
      rows: DiffRow[];
    };
import { DiffRow } from "./diffrows";

export type ViewRow =
  | { kind: 'row'; row: DiffRow }
  | { kind: 'collapse'; id: string; hiddenCount: number; rows: DiffRow[] };

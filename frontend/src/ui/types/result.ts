import { Finding } from "./finding";

export type Result = {
  overall: string;
  should_fail: boolean;
  count: number;
  findings?: Finding[];
};

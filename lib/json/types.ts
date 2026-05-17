export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ParseSuccess = { ok: true; value: JsonValue };

export type ParseFailure = {
  ok: false;
  line: number;
  col: number;
  position: number;
  message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

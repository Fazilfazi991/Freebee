declare module 'papaparse' {
  type ParseError = { row?: number; message: string };
  type ParseResult<T> = { data: T[]; errors: ParseError[]; meta: { delimiter: string; fields?: string[] } };
  const papa: {
    parse<T = Record<string, string>>(
      input: string,
      options?: { header?: boolean; delimiter?: string; skipEmptyLines?: boolean },
    ): ParseResult<T>;
    unparse(input: Record<string, unknown>[], options?: { delimiter?: string; escapeFormulae?: boolean }): string;
  };
  export default papa;
}

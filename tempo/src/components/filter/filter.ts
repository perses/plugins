/** A model of a filter bar for common tracing attributes. All attributes are combined with AND, the values of an attribute are combined with OR. */
export interface Filter {
  serviceName: string[];
  spanName: string[];
  namespace: string[];
  status: string[];
  spanDuration: DurationField;
  traceDuration: DurationField;
  customMatchers: string[];
}

export interface DurationField {
  min?: string;
  max?: string;
}

/** split a string by whitespace, except when inside quotes */
export function splitByUnquotedWhitespace(x: string) {
  let quote = false;
  let from = 0;
  const chunks: string[] = [];
  for (let i = 0; i < x.length; i++) {
    if (x[i] == '"' && x[i - 1] != '\\') {
      quote = !quote;
    } else if (x[i] == ' ' && !quote) {
      chunks.push(x.slice(from, i));
      from = i + 1;
    }
  }
  chunks.push(x.slice(from, x.length));
  return chunks.filter((x) => x);
}

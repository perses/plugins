import { splitByUnquotedWhitespace } from './filter';

describe('Filter', () => {
  it.each([
    {
      input: '',
      expected: [],
    },
    {
      input: 'key=value',
      expected: ['key=value'],
    },
    {
      input: 'key=value    key2=value2',
      expected: ['key=value', 'key2=value2'],
    },
    {
      input: 'key="string value value2"',
      expected: ['key="string value value2"'],
    },
    {
      input: 'key=value   key2=value2 key3="string value"',
      expected: ['key=value', 'key2=value2', 'key3="string value"'],
    },
  ])('splitByWhitespace ($input)', ({ input, expected }) => {
    expect(splitByUnquotedWhitespace(input)).toEqual(expected);
  });
});

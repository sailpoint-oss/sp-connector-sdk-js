import { ReplaceHexInObject } from './parseHexadecimal'; 
import { StdAccountReadOutput } from './commands';

describe('ReplaceHexInObject', () => {
  it('should replace hexadecimal values with unicode characters and newlines with semicolons', () => {
    const input = {
      attributes: {
        text: '450 Tynan Ct&#xa;Erie, CO 80516&#xa;United States of America',
        name: '&#xa;',
        number: 123,
        bool: true,
        stringArray: ['&#xa;', 123, true],
        numberArray: [111, 222, 123],
      }
    } as StdAccountReadOutput;

    const expectedOutput = {
      text: '450 Tynan Ct;Erie, CO 80516;United States of America',
      name: ';',
      number: 123,
      bool: true,
      stringArray: [';', 123, true],
      numberArray: [111, 222, 123],
    };

    // Pass input.attributes directly
    expect(ReplaceHexInObject(input.attributes)).toEqual(expectedOutput); 
  });

  it('should handle null input', () => {
    expect(ReplaceHexInObject({})).toEqual({});
  });

  it('should handle various hex formats', () => {
    const input = {
      attributes: {
        text1: '\\x41\\x42\\x43', // \xHH
        text2: '\\u0041\\u0042\\u0043', // \uHHHH
        text3: '\\u{1F600}', // \u{H+} 
        text4: '&#x41;&#x42;&#x43;', // &#xHH;
        text5: '\\xGG',
      }
    } as StdAccountReadOutput;

    const expectedOutput = {
      text1: 'ABC',
      text2: 'ABC',
      text3: '😀',
      text4: 'ABC',
      text5: '\\xGG',
    };

    expect(ReplaceHexInObject(input.attributes)).toEqual(expectedOutput); 
  });
  it('should return the original match if no specific hex capture group is found', () => {
    const input = {
      attributes: {
        text: '\\xGG\\uZZZZ\\u{GGGG}&#xGG;', // invalid hex sequences
      }
    } as StdAccountReadOutput;

    const expectedOutput = {
      text: '\\xGG\\uZZZZ\\u{GGGG}&#xGG;', // input should be unchanged
    };

    expect(ReplaceHexInObject(input.attributes)).toEqual(expectedOutput);
  });

  it('should handle mixed hex and non-hex patterns', () => {
    const input = {
      attributes: {
        mixed: 'This string has \\x41 and \\z00 and \\u0042 and &q00; and &#x43; and \\xGG and &#xZZ',
      }
    } as StdAccountReadOutput;

    const expectedOutput = {
      mixed: 'This string has A and \\z00 and B and &q00; and C and \\xGG and &#xZZ',
    };

    expect(ReplaceHexInObject(input.attributes)).toEqual(expectedOutput);
  });

  it('handle \\x hexadecimal in a string', () => {
    const input = {
      attributes: {
        testString: 'Prefix\\x41Suffix',
      },
    } as StdAccountReadOutput;

    const expectedOutput = {
      testString: 'PrefixASuffix',
    };
    expect(ReplaceHexInObject(input.attributes)).toEqual(expectedOutput);
  });

  it('handle \\x hexadecimal in an array of strings', () => {
    const input = {
      attributes: {
        testArray: ['\\x42Item1', 'Item2\\x43'],
      },
    } as StdAccountReadOutput;

    const expectedOutput = {
      testArray: ['BItem1', 'Item2C'],
    };
    expect(ReplaceHexInObject(input.attributes)).toEqual(expectedOutput);
  });
});


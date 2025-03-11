import {Attributes } from './commands';
import { UnescapeHexInObject } from './unescape';

function fuzzUnescapeTests() {
  const testCount = 1000;

  for (let i = 0; i < testCount; i++) {
    const input: Attributes = {};
    const keyCount = Math.floor(Math.random() * 10);

    for (let j = 0; j < keyCount; j++) {
      const key = `key${j}`;
      const valueType = Math.floor(Math.random() * 3); // 0: string, 1: number, 2: array, 3: bool

      if (valueType === 0) {
        input[key] = generateRandomString();
      } else if (valueType === 1) {
        input[key] = Math.floor(Math.random() * 100);
      } else if (valueType === 2) {
        const arrayLength = Math.floor(Math.random() * 5);
        const array: any[] = [];
        for (let k = 0; k < arrayLength; k++) {
          const arrayItemType = Math.floor(Math.random() * 2); // 0: string, 1: number
          if (arrayItemType === 0) {
            array.push(generateRandomString());
          } else {
            array.push(Math.floor(Math.random() * 100));
          }
        }
        input[key] = array;
      } else {
        input[key] = Math.random() < 0.5;
      }
    }

    try {
      UnescapeHexInObject(input);
      // If no exception, test passes (for this specific fuzz iteration)
    } catch (e) {
      console.error('Fuzz test failed:', input, e);
      throw e; // Rethrow to stop the test suite.
    }
  }
  console.log(`Fuzz tests passed (${testCount} iterations)`);
}

function generateRandomString(): string {
  const length = Math.floor(Math.random() * 20);
  const chars = 'abcdef0123456789\\xu{}&#;';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Randomly add hex sequences
  if (Math.random() < 0.2) {
    const hexType = Math.floor(Math.random() * 4); // 0: \\x, 1: \\u, 2: \\u{}, 3: &#x;
    const hexValue = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    const unicodeValue = Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');
    const curlyUnicodeValue = Math.floor(Math.random() * 1114112).toString(16);

    if (hexType === 0) {
      result += `\\x${hexValue}`;
    } else if (hexType === 1) {
      result += `\\u${unicodeValue}`;
    } else if (hexType === 2) {
      result += `\\u{${curlyUnicodeValue}}`;
    } else if (hexType === 3) {
      result += `&#x${hexValue};`;
    }
  }

  if(Math.random() < 0.1){
    result += '\n';
  }
  return result;
}

fuzzUnescapeTests();
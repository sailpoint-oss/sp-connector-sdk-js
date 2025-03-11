import {
  Attributes,
} from './commands'

// UnescapeHexInObject replace the hexadecimal values to its equivalent unicode values
export function UnescapeHexInObject(obj: Attributes): Attributes {
  if (!obj) return {}; // handle null or undefined inputs

  const processedObj: { [key: string]: any } = {};
  const hexPattern = /(\\x([0-9a-fA-F]{2}))|(\\u([0-9a-fA-F]{4}))|(\\u\{([0-9a-fA-F]+)\})|(?:&#x([0-9a-fA-F]+);)/g;

  for (const key in obj) {
    const value = obj[key];

    // handle string type
    if (typeof value === 'string') {
      processedObj[key] = value.replace(hexPattern, (match, xMatch, xHex, uMatch, uHex, uCurlyMatch, uCurlyHex, htmlHex) => {
        if (xHex) return String.fromCharCode(parseInt(xHex, 16));
        if (uHex) return String.fromCharCode(parseInt(uHex, 16));
        if (uCurlyHex) return String.fromCodePoint(parseInt(uCurlyHex, 16));
        if (htmlHex) return String.fromCharCode(parseInt(htmlHex, 16));
        return match;
      })
      // handle []string type
    } else if (Array.isArray(value)) {
      processedObj[key] = value.map(item => {
        if (typeof item === 'string') {
          return item.replace(hexPattern, (match, xMatch, xHex, uMatch, uHex, uCurlyMatch, uCurlyHex, htmlHex) => {
            if (xHex) return String.fromCharCode(parseInt(xHex, 16));
            if (uHex) return String.fromCharCode(parseInt(uHex, 16));
            if (uCurlyHex) return String.fromCodePoint(parseInt(uCurlyHex, 16));
            if (htmlHex) return String.fromCharCode(parseInt(htmlHex, 16));
            return match;
          })
        } else {
          return item; // Keep non-string array items as they are
        }
      });
    } else {
      processedObj[key] = value; // keep non-string attributes as they are
    }
  }

  return processedObj;
}
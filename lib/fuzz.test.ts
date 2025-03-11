import { Attributes } from './commands';
import { UnescapeHexInObject } from './unescape';
import fc from 'fast-check';

function fuzzUnescapeTests() {
  fc.assert(
    fc.property(
      fc.dictionary(fc.string(), fc.oneof(
        fc.string(),
        fc.integer(),
        fc.array(fc.oneof(fc.string(), fc.integer())),
        fc.boolean()
      )),
      (randomInput: any) => {
        try {
          UnescapeHexInObject(randomInput as Attributes);
          return true;
        } catch (e) {
          console.error('Fuzz test failed:', randomInput, e);
          throw e;
        }
      }
    ),
    { numRuns: 1000 }
  );
  console.log('Fuzz tests passed');
}

fuzzUnescapeTests();
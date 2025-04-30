import { Filter } from './filter';
describe('Filter class', () => {
  let filterInstance: Filter;

  beforeEach(() => {
    // set up some mock data for testing
    const data = {
      name: 'Alice',
      age: 30,
      email: 'alice@example.com',
      address: ['Pune','Austin'],
      department: '',
    }
    filterInstance = new Filter(data);
  });

  test('should apply binary expression filters', () => {
    // equal to
    expect(filterInstance.matcher('name == "Alice"')).toBe(true);

    // not equal to
    expect(filterInstance.matcher('age != 25')).toBe(true);
    expect(filterInstance.matcher('age != 30')).toBe(false);

    // greater than
    expect(filterInstance.matcher('age > 25')).toBe(true);
    expect(filterInstance.matcher('age > 35')).toBe(false);

    // less than
    expect(filterInstance.matcher('age < 35')).toBe(true);
    expect(filterInstance.matcher('age < 25')).toBe(false);

    // greater than or equal to
    expect(filterInstance.matcher('age >= 30')).toBe(true);
    expect(filterInstance.matcher('age >= 40')).toBe(false);

    // less than or equal to
    expect(filterInstance.matcher('age <= 30')).toBe(true);
    expect(filterInstance.matcher('age <= 25')).toBe(false);

    // strict equality
    expect(filterInstance.matcher('name == "Alice"')).toBe(true);
    expect(filterInstance.matcher('name == "Tom"')).toBe(false);

    // invert operation (! NOT operation)
    expect(filterInstance.matcher('!(name == "Alice")')).toBe(false);
    expect(filterInstance.matcher('!(name == "Tom")')).toBe(true);
  });

  test('should apply logical AND filter (&&)', () => {
    const filterString = 'age > 25 && name === "Alice"';
    expect(filterInstance.matcher(filterString)).toBe(true);

    const filterStringFalse = 'age < 25 && name === "Alice"';
    expect(filterInstance.matcher(filterStringFalse)).toBe(false);
  });

  test('should apply logical OR filter (||)', () => {
    const filterString = 'age < 25 || name === "Alice"';
    expect(filterInstance.matcher(filterString)).toBe(true);

    const filterStringFalse = 'age < 25 || name === "Tom"';
    expect(filterInstance.matcher(filterStringFalse)).toBe(false);
  });

  test('should apply call expression filters', () => {
    // isNull
    expect(filterInstance.matcher('name.isNull()')).toBe(false);  // 'name' is 'Alice'
    expect(filterInstance.matcher('email.isNull()')).toBe(false); // 'email' is 'alice@example.com'

    // notNull
    expect(filterInstance.matcher('name.notNull()')).toBe(true);
    expect(filterInstance.matcher('email.notNull()')).toBe(true);

    // isEmpty
    expect(filterInstance.matcher('department.isEmpty()')).toBe(true);
    expect(filterInstance.matcher('name.isEmpty()')).toBe(false);

    // notEmpty
    expect(filterInstance.matcher('department.notEmpty()')).toBe(false);
    expect(filterInstance.matcher('name.notEmpty()')).toBe(true);

    // startsWith
    expect(filterInstance.matcher('email.startsWith("alice")')).toBe(true);
    expect(filterInstance.matcher('email.startsWith("tom")')).toBe(false);

    // endsWith
    expect(filterInstance.matcher('email.endsWith("example.com")')).toBe(true);
    expect(filterInstance.matcher('email.endsWith("gmail.com")')).toBe(false);

    // contains
    expect(filterInstance.matcher('email.contains("example")')).toBe(true);
    expect(filterInstance.matcher('email.contains("yahoo")')).toBe(false);

    // containsAll
     expect(filterInstance.matcher('address.containsAll("Pune", "Austin")')).toBe(true);
     expect(filterInstance.matcher('address.containsAll("Pune", "NY")')).toBe(false);

    // startsWithIgnoreCase
    expect(filterInstance.matcher('email.startsWithIgnoreCase("Ali")')).toBe(true);
    expect(filterInstance.matcher('email.startsWithIgnoreCase("rit")')).toBe(false);

    // endsWithIgnoreCase
    expect(filterInstance.matcher('email.endsWithIgnoreCase(".org")')).toBe(true);
    expect(filterInstance.matcher('email.endsWithIgnoreCase(".com")')).toBe(false);

    // containsIgnoreCase
    expect(filterInstance.matcher('email.containsIgnoreCase("google")')).toBe(true);
    expect(filterInstance.matcher('email.containsIgnoreCase("example")')).toBe(false);

    // containsAllIgnoreCase
    expect(filterInstance.matcher('address.containsAllIgnoreCase("NY", "Texas")')).toBe(true);
    expect(filterInstance.matcher('address.containsAllIgnoreCase("Pune", "NY")')).toBe(false);
  });

  test('should handle AND/OR binary expression correctly', () => {
    // binaryExpression && binaryExpression
    expect(filterInstance.matcher('(age > 25 && name == "Alice")')).toBe(true);
    // binaryExpression && binaryExpression
    expect(filterInstance.matcher('(age > 25 && name != "Alice")')).toBe(false);
    // binaryExpression && callExpression
    expect(filterInstance.matcher('(age > 25 && department.isEmpty())')).toBe(true);
    // binaryExpression && callExpression
    expect(filterInstance.matcher('(age > 25 && department.notEmpty())')).toBe(false);
    // callExpression && callExpression
    expect(filterInstance.matcher('(name.isEmpty() && department.notEmpty())')).toBe(false);

    // binaryExpression || binaryExpression
    expect(filterInstance.matcher('(age < 25 || name == "Alice")')).toBe(true);
    // binaryExpression || binaryExpression
    expect(filterInstance.matcher('(age > 25 || name == "Alice")')).toBe(true);
    // binaryExpression || callExpression
    expect(filterInstance.matcher('(age <= 25 || name.isEmpty())')).toBe(false);
    // callExpression || callExpression
    expect(filterInstance.matcher('(department.notEmpty() || name.isEmpty())')).toBe(false);
  });

  test('should handle negation (!)', () => {
    // ! callExpression
    expect(filterInstance.matcher('!(name.isNull())')).toBe(true);
    // ! binaryExpression
    expect(filterInstance.matcher('!(name == "Alice")')).toBe(false);
  });

  test('should handle complex AND/OR binary expression correctly', () => {
		// binaryExpression && binaryExpression
		expect(
			filterInstance.matcher(
				'(((age > 25 && name.notNull()) && email == "alice@example.com") || department.isEmpty())'
			)
		).toBe(true)
	})
});

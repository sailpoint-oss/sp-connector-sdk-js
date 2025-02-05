const jsep = require("jsep");

export class Filter {
  private data: any;

  constructor(data: any) {
    this.data = data;
  }

  // matcher decides which operation to be performed based on resource object based on the provided filter object
  public matcher(filterString: string) {
    let filter = jsep(filterString);
    switch (true) {
      case (filter.type === 'BinaryExpression' && filter.operator !== '&&' && filter.operator !== '||'):
        return this.applyBinaryExpressionFilter(filter);
      case (filter.type === 'CallExpression' && filter.operator !== '&&' && filter.operator !== '||'):
        return this.applyCallExpressionFilter(filter);
      case (filter.operator === '!'):
        return !this.applyBinaryExpressionFilter(filter.argument);
      case (filter.operator === '&&')|| (filter.operator === '||'):
        return this.applyAndOrComplexFilter(filter);
    }
  }

  // filterString Example: (age > 20)
  // Filter evaluter Example :
  //{
  //  type: 'BinaryExpression',
  //  operator: '>',
  //  left: { type: 'Identifier', name: 'age' },
  //  right: { type: 'Literal', value: 20 }
  //};
  // applyBinaryExpressionFilter applies binarry filters on an objects
  private applyBinaryExpressionFilter(filter: any): any {
    // check the type of the filter, which should be BinaryExpression for comparison
    if (filter.type === 'BinaryExpression') {
      const left = filter.left; // left part (field to compare)
      const right = filter.right; // right part (value to compare against)
      const operator = filter.operator;  // comparison operator
      // retrieve the field value from the object (e.g., obj[firstName])
      const leftValue = this.data[left.name];

      switch (operator) {
        case '==':  // equality check
          return leftValue == right.value;
        case '===': // strict equality check
          return leftValue === right.value;
        case '>': // greater than check
          return leftValue > right.value;
        case '<': // less than check
          return leftValue < right.value;
        case '>=': // greater than or equal check
          return leftValue >= right.value;
        case '<=': // less than or equal check
          return leftValue <= right.value;
        case '!=':  // inequality check
          return leftValue != right.value;
      }
    }
  }

  // a mock of the isNull method that could be attached to an object like 'email' 'name' etc..
  private isNullorEmpty(value: any) {
    return value === null || value === undefined || value === '';
  }

  // filterString Example: email.isNull()
  // Filter evaluter output Example for CallExpression :
  // {
  // type: 'CallExpression',
  // arguments: [],
  // callee: {
  //    type: 'MemberExpression',
  //    computed: false,
  //    object: { type: 'Identifier', name: 'email' },
  //    property: { type: 'Identifier', name: 'isNull' }
  //   }
  // };
  // applyCallExpressionFilte applies filter based on CallExpression
  private applyCallExpressionFilter(filter: any) {
    // check if the filter is a CallExpression
    if (filter.type === 'CallExpression') {
      const callee = filter.callee;  // the MemberExpression for the method call
      const objectName = callee.object.name; // the object name (e.g., 'email')
      const methodName = callee.property.name;  // the method name (e.g., 'isNull')
      const args = filter.arguments;

      // check if the object in the filter matches the object's name in the input data
      if (this.data.hasOwnProperty(objectName)) {
        const value = this.data[objectName]; // get the value of the object (e.g., email)
        switch (methodName) {
          case 'isNull':  // check if the method is `isNull` and apply it to the value
            return this.isNullorEmpty(value);  // apply the isNull method
          case 'notNull': // check if the method is `notNull` and apply it to the value
            return !this.isNullorEmpty(value); // apply the notNull method
          case 'isEmpty':  // check if the method is `isEmpty` and apply it to the value
            return this.isNullorEmpty(value);  // apply the isEmpty method
          case 'notEmpty': // check if the method is `notEmpty` and apply it to the value
            return !this.isNullorEmpty(value);  // apply the notEmpty method
          case 'startsWith':  // check if the method is `startsWith` and apply it to the value
            return value.startsWith(args[0].value); // apply the startsWith method
          case 'endsWith': // check if the method is `endsWith` and apply it to the value
            return value.endsWith(args[0].value);  // apply the endsWith method
          case 'startsWithIgnoreCase':  // check if the method is `startsWithIgnoreCase` and apply it to the value
            return !value.startsWith(args[0].value);  // apply the startsWithIgnoreCase method
          case 'endsWithIgnoreCase': // check if the method is `endsWithIgnoreCase` and apply it to the value
            return !value.endsWith(args[0].value);  // apply the endsWithIgnoreCase method
          case 'contains':  // check if the method is `contains` and apply it to the value
            return value.includes(args[0].value); // apply the contains method
          case 'containsIgnoreCase':  // check if the method is `containsIgnoreCase` and apply it to the value
            return !value.includes(args[0].value); // apply the containsIgnoreCase method
          case 'containsAll':// Check if the method is `containsAll` and apply it to the value
            // ensure all values are present in the property
            return args.every((arg: { value: string }) => value.includes(arg.value)); // apply the containsAll method
          case 'containsAllIgnoreCase':// Check if the method is `containsAllIgnoreCase` and apply it to the value
            // ensure all values are present in the property
            return args.every((arg: { value: string }) => !value.includes(arg.value));// apply the containsAllIgnoreCase method
        }
      }
    }
  }

  // // filterString Example 1: ( type == "Employee" && location == "Austin" )
  // filterString Example 2: (((login == \"integrations-shtarko\" && name.isNull()) && company == \"sailpoint\") || city == \"pune\")
  // Filter evaluter output Example :
  // {
  //   type: 'BinaryExpression',
  //   operator: '||',
  //   left: {
  //     type: 'BinaryExpression',
  //     operator: '&&',
  //     left: {
  //       type: 'BinaryExpression',
  //       operator: '&&',
  //       left: [Object],
  //       right: [Object]
  //     },
  //     right: {
  //       type: 'BinaryExpression',
  //       operator: '==',
  //       left: [Object],
  //       right: [Object]
  //     }
  //   },
  //   right: {
  //     type: 'BinaryExpression',
  //     operator: '==',
  //     left: { type: 'Identifier', name: 'city' },
  //     right: { type: 'Literal', value: 'punee', raw: '"punee"' }
  //   }
  // }
  // applyAndOrComplexFilter applies filter based on BinaryExpression and CallExpression on complex as well as simple filters
  private applyAndOrComplexFilter(filter: any): boolean {
    // if the current expression is a comparison
    if (filter.type === 'BinaryExpression' && ['==', '===', '!=', '!==', '<', '>', '<=', '>='].includes(filter.operator)) {
      return this.applyBinaryExpressionFilter(filter);
    }

    if (filter.type === 'CallExpression') {
      return this.applyCallExpressionFilter(filter);
    }
    // if the current expression is a logical operator (e.g., ||, &&)
    if (filter.type === 'BinaryExpression' && ['||', '&&'].includes(filter.operator)) {
      const leftResult = this.applyAndOrComplexFilter(filter.left);  // apply to the left side
      const rightResult = this.applyAndOrComplexFilter(filter.right); // apply to the right side
      // combine the results if both sides are processed
      if (filter.operator === '||') {
        return leftResult || rightResult; // logical OR
      }
      if (filter.operator === '&&') {
        return leftResult && rightResult; // logical AND
      }
    }
    return true
  }
}
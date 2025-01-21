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
      case (filter.operator === '&&'):
        return this.applyAndBinaryExpressionFilter(filter);
      case (filter.operator === '||'):
        return this.applyOrBinaryExpressionFilter(filter);
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
  private applyBinaryExpressionFilter(filter: any) {
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

  // filterString Example: ( type == "Employee" && location == "Austin" )
  // Filter Evaluator Example for AND operation with multiple expressions:
  // {
  //     type: 'BinaryExpression',
  //     operator: '&&',
  //     left: {
  //       type: 'BinaryExpression',
  //       operator: '&&',
  //       left: {
  //         type: 'BinaryExpression',
  //         operator: '==',
  //         left: [Object],
  //         right: [Object]
  //       },
  //       right: {
  //         type: 'BinaryExpression',
  //         operator: '==',
  //         left: [Object],
  //         right: [Object]
  //       }
  //     },
  //     right: {
  //       type: 'BinaryExpression',
  //       operator: '==',
  //       left: { type: 'Identifier', name: 'age' },
  //       right: { type: 'Literal', value: null, raw: 'null' }
  //     }
  //   }
  // applyAndBinaryExpressionFilter applies AND BinaryExpression and CallExpression filters
  private applyAndBinaryExpressionFilter(filter: any){
    let currentFilter = filter;
    let rightValue = [];
    let leftValue = [];

    // keep processing the filter as long as we have '&&' operators
    while (currentFilter.operator === '&&') {
      if (currentFilter.right.type === 'BinaryExpression') {
        // evaluate the right part of the current '&&' expression
        rightValue.push(this.applyBinaryExpressionFilter(currentFilter.right));
        currentFilter = currentFilter.left;
        if (currentFilter.operator !== '&&' && currentFilter.type === 'BinaryExpression') {
          leftValue.push(this.applyBinaryExpressionFilter(currentFilter));
        }
      } else {
        // evaluate the right part of the current '&&' expression
        rightValue.push(this.applyCallExpressionFilter(currentFilter.right));
        currentFilter = currentFilter.left;
        if (currentFilter.operator !== '&&' && currentFilter.type === 'CallExpression') {
          leftValue.push(this.applyCallExpressionFilter(currentFilter));
        }
      }
    }
    return rightValue.every(Boolean) && leftValue.every(Boolean);
  }

  // filterString Example: ( type == "Employee" || location == "Austin" )
  // Filter Evaluator Example for OR operation with multiple expressions:
  // {
  //     type: 'BinaryExpression',
  //     operator: '||',
  //     left: {
  //       type: 'BinaryExpression',
  //       operator: '||',
  //       left: {
  //         type: 'BinaryExpression',
  //         operator: '==',
  //         left: [Object],
  //         right: [Object]
  //       },
  //       right: {
  //         type: 'BinaryExpression',
  //         operator: '==',
  //         left: [Object],
  //         right: [Object]
  //       }
  //     },
  //     right: {
  //       type: 'BinaryExpression',
  //       operator: '==',
  //       left: { type: 'Identifier', name: 'age' },
  //       right: { type: 'Literal', value: null, raw: 'null' }
  //     }
  //   }
  //  applyOrBinaryExpressionFilter applies OR BinaryExpression and CallExpression filters
  private applyOrBinaryExpressionFilter(filter: any){
    let currentFilter = filter;
    let rightValue = [];
    let leftValue = [];

    // keep processing the filter as long as we have '||' operators
    while (currentFilter.operator === '||') {
      if (currentFilter.right.type === 'BinaryExpression') {
        // evaluate the right part of the current '||' expression
        rightValue.push(this.applyBinaryExpressionFilter(currentFilter.right));
        currentFilter = currentFilter.left;
        if (currentFilter.operator !== '||' && currentFilter.type === 'BinaryExpression') {
          leftValue.push(this.applyBinaryExpressionFilter(currentFilter));
        }
      } else {
        // evaluate the right part of the current '||' expression
        rightValue.push(this.applyCallExpressionFilter(currentFilter.right));
        currentFilter = currentFilter.left;
        if (currentFilter.operator !== '||' && currentFilter.type === 'CallExpression') {
          leftValue.push(this.applyCallExpressionFilter(currentFilter));
        }
      }
    }
    return rightValue.some(Boolean) || leftValue.some(Boolean);
  }
}


//const filterEvaluator = new Filter(data);
//const result = filterEvaluator.matcher(filterString);
import jsep from 'jsep';

export class Filter {
  private data: any

  constructor(data: any) {
    this.data = data
  }

  // matcher decides which operation to be performed based on resource object based on the provided filter object
  public matcher(filterString: string): boolean {
    let filter = jsep(filterString)
    return this.applyFilter(filter)
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
  private applyBinaryExpressionFilter(filter: jsep.Expression): boolean {
    const binaryExpression = filter as jsep.BinaryExpression // Type assertion
    const left = binaryExpression.left
    const right = binaryExpression.right
    const operator = binaryExpression.operator

    let leftValue = left.type === 'Identifier' ? this.data[`${left.name}`] : left.value
    let rightValue = right.type === 'Identifier' ? this.data[`${right.name}`] : right.value

    switch (operator) {
      case '==':
        return leftValue == rightValue
      case '===':
        return leftValue === rightValue
      case '>':
        return leftValue > rightValue
      case '<':
        return leftValue < rightValue
      case '>=':
        return leftValue >= rightValue
      case '<=':
        return leftValue <= rightValue
      case '!=':
        return leftValue != rightValue
      default:
        return false
    }
  }

  private isNullorEmpty(value: any) {
    return value === null || value === undefined || value === ''
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
  private applyCallExpressionFilter(filter: jsep.Expression): boolean {
    // check if the filter is a CallExpression
    const callExpression = filter as jsep.CallExpression
    const callee = callExpression.callee
    const object = callee.object as jsep.Expression
    const property = callee.property as jsep.Expression
    const args = callExpression.arguments

    // check if the object in the filter matches the object's name in the input data
    if (this.data.hasOwnProperty(`${object.name}`)) {
      const value = this.data[`${object.name}`] // get the value of the object (e.g., email)
      switch ( `${property.name}`) {
        case 'isNull':  // check if the method is `isNull` and apply it to the value
          return this.isNullorEmpty(value)  // apply the isNull method
        case 'notNull': // check if the method is `notNull` and apply it to the value
          return !this.isNullorEmpty(value) // apply the notNull method
        case 'isEmpty':  // check if the method is `isEmpty` and apply it to the value
          return this.isNullorEmpty(value)  // apply the isEmpty method
        case 'notEmpty': // check if the method is `notEmpty` and apply it to the value
          return !this.isNullorEmpty(value) // apply the notEmpty method
        case 'startsWith':  // check if the method is `startsWith` and apply it to the value
          return value.startsWith(args[0].value) // apply the startsWith method
        case 'endsWith': // check if the method is `endsWith` and apply it to the value
          return value.endsWith(args[0].value)  // apply the endsWith method
        case 'startsWithIgnoreCase':  // check if the method is `startsWithIgnoreCase` and apply it to the value
          return !value.startsWith(args[0].value)  // apply the startsWithIgnoreCase method
        case 'endsWithIgnoreCase': // check if the method is `endsWithIgnoreCase` and apply it to the value
          return !value.endsWith(args[0].value)  // apply the endsWithIgnoreCase method
        case 'contains':  // check if the method is `contains` and apply it to the value
          return value.includes(args[0].value) // apply the contains method
        case 'containsIgnoreCase':  // check if the method is `containsIgnoreCase` and apply it to the value
          return !value.includes(args[0].value) // apply the containsIgnoreCase method
        case 'containsAll':// Check if the method is `containsAll` and apply it to the value
          // ensure all values are present in the property
          return args.every((arg => value.includes(arg.value))) // apply the containsAll method
        case 'containsAllIgnoreCase':// Check if the method is `containsAllIgnoreCase` and apply it to the value
          // ensure all values are present in the property
          return args.every((arg => !value.includes(arg.value)))// apply the containsAllIgnoreCase method
        default:
          return true
      }
    }
    return true
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
  // applyFilter applies filter based on BinaryExpression, CallExpression, UnaryExpression filters on simple and complex filter string
  private applyFilter(filter: jsep.Expression): boolean {
    if (filter.type === 'UnaryExpression' && ['!'].includes(`${filter.operator}`)){
      let filterArg = filter.argument as jsep.Expression
      return !this.applyBinaryExpressionFilter(filterArg)
    }
    // if the current expression is a comparison
    if (filter.type === 'BinaryExpression' && ['==', '===', '!=', '!==', '<', '>', '<=', '>='].includes(`${filter.operator}`)) {
      return this.applyBinaryExpressionFilter(filter)
    }

    if (filter.type === 'CallExpression') {
      return this.applyCallExpressionFilter(filter);
    }
    // if the current expression is a logical operator (e.g., ||, &&)
    if (filter.type === 'BinaryExpression' && ['||', '&&'].includes(`${filter.operator}`)) {
      const leftFilter = filter.left as jsep.Expression
      const rightFilter = filter.right as jsep.Expression
      const leftResult = this.applyFilter(leftFilter);  // apply to the left side
      const rightResult = this.applyFilter(rightFilter); // apply to the right side
      // combine the results if both sides are processed
      if (filter.operator === '||') {
        return leftResult || rightResult // logical OR
      }
      if (filter.operator === '&&') {
        return leftResult && rightResult // logical AND
      }
    }
    return true
  }
}
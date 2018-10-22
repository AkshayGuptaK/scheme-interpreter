function multiply () {
  let result = 1
  for (let i = 0; i < arguments.length; i++) {
    result *= arguments[i]
  } return result
}

function sum () {
  let result = 0
  for (let i = 0; i < arguments.length; i++) {
    result += arguments[i]
  } return result
}

function subtract () {
  if (arguments.length > 1) {
    let result = arguments[0]
    arguments[0] = 0
    let total = sum.apply(null, arguments)
    return result - total
  } else {
    return -arguments[0]
  }
}

function divide () {
  if (arguments.length > 1) {
    let result = arguments[0]
    arguments[0] = 1
    return result / multiply.apply(null, arguments)
  } else {
    return 1 / arguments[0]
  }
}

function toArray () {
  return Array.from(arguments)
}

var globalEnvironment = {
  '*': multiply,
  '+': sum,
  '-': subtract,
  '/': divide,
  '<': (a, b) => (a < b),
  '<=': (a, b) => (a <= b),
  '>': (a, b) => (a > b),
  '>=': (a, b) => (a >= b),
  'abs': Math.abs,
  'expt': Math.pow,
  'max': Math.max,
  'min': Math.min,
  'pi': Math.PI,
  'car': (a) => (a[0]),
  'cdr': (a) => (a.slice(1)),
  'cons': (a, b) => [a].concat(b),
  'equal?': (a, b) => a === b,
  '=': 'equal?',
  'list': toArray
} // store any defines here

function lookUpValue (variable, scope) {
  let value = ''

  while (typeof value === 'string') {
    if (scope === null) {
      if (variable in globalEnvironment) {
        value = globalEnvironment[variable]
        variable = value
      } else {
        return null
      }
    } else if (variable in scope) {
      value = scope[variable]
      variable = value
    } else if ('outer' in scope) {
      return lookUpValue(variable, scope['outer'])
    } else if (variable in globalEnvironment) {
      value = globalEnvironment[variable]
      variable = value
    } else {
      return null
    }
  } return value
}

function lookUpScope (variable, scope) {
  let value = ''
  let appScope

  while (typeof value === 'string') {
    if (scope === null) {
      if (variable in globalEnvironment) {
        appScope = globalEnvironment
        value = globalEnvironment[variable]
        variable = value
      } else {
        return null
      }
    } else if (variable in scope) {
      appScope = scope
      value = scope[variable]
      variable = value
    } else if ('outer' in scope) {
      return lookUpScope(variable, scope['outer'])
    } else if (variable in globalEnvironment) {
      appScope = globalEnvironment
      value = globalEnvironment[variable]
      variable = value
    } else {
      return null
    }
  } return appScope
}

function interpreterLoop (input, interpreters, scope) {
  let value
  let returned
  for (let interpreter of interpreters) {
    returned = interpreter(input, scope)
    if (returned != null) {
      [value, input] = returned
      break
    }
  } if (returned === null) {
    throw new SyntaxError('Input invalid for all interpreters. Input is ' + input)
  } else {
    return [value, input]
  }
}

function mainInterpreter (input, scope) { // call this
  // console.log('input is', input) // DEBUG
  // console.log('scope is', JSON.stringify(scope)) // DEBUG
  const interpreters = [blockInterpreter, variableInterpreter, constantInterpreter]
  let result = interpreterLoop(input, interpreters, scope)
  // console.log('result is', result) // DEBUG
  return result[0]
}

function blockInterpreter (input, scope) {
  const interpreters = [defineInterpreter, ifInterpreter, quoteInterpreter, lambdaInterpreter, assignInterpreter, procInterpreter]
  let result = /^[(]/.exec(input)
  if (result === null) {
    return null
  } else {
    input = input.slice(1)
    return interpreterLoop(input, interpreters, scope)
  }
}

function bracketProcessor (input) { // finds the bracket enclosed block
  // console.log('bracket input is', input) // DEBUG
  let openBrackets = 1
  let index = 2
  while (openBrackets > 0) {
    if (input[index] === '(') {
      openBrackets++
    } else if (input[index] === ')') {
      openBrackets--
    } index++
  } // console.log('slices are', [input.slice(1, index), input.slice(index)]) // DEBUG
  return [input.slice(1, index), input.slice(index)]
}

function atomizer (input) { // breaks input into subblocks
  let subblocks = []
  let result
  while (input !== ')') {
    if (/^ ?[(]/.test(input) === true) {
      result = bracketProcessor(input)
      subblocks.push(result[0])
      input = result[1]
    } else {
      result = /^ ?[^ )]+/.exec(input)
      if (result === null) {
        // console.log('Subblock inputs', input, subblocks) // DEBUG
        throw new SyntaxError('This is not a valid sub block')
      } else {
        subblocks.push(result[0].replace(' ', ''))
        input = input.slice(result[0].length)
      }
    }
  } return subblocks
}

function variableInterpreter (input, scope) {
  let result = lookUpValue(input, scope)
  if (result === null) {
    return null
  } else {
    return [result, '']
  }
}

function processNumber (numberString) {
  let sign = 1
  let number = 0
  let length = 0

  if (/-/.test(numberString)) {
    sign = -1
  } numberString = /\d+/.exec(numberString)[0]
  for (let digit of numberString) {
    digit = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].indexOf(digit)
    number = number * 10 + digit
    length++
  } return [sign, number, length]
}

function constantInterpreter (input, scope) {
  let sign = 1
  let exponentSign = 1
  let number = 0
  let decimal = 0
  let exponent = 0
  let length = 0

  let result = /^\s?(-?(0|\d+))([.]\d+)?([Ee][+-]?\d+)?/.exec(input)
  if (result === null) {
    return null
  } else {
    [sign, number, length] = processNumber(result[2])
    if (result[3] !== undefined) {
      [exponentSign, decimal, length] = processNumber(result[3])
      number += decimal / Math.pow(10, length)
    }
    if (result[4] !== undefined) {
      [exponentSign, exponent, length] = processNumber(result[4])
      number *= Math.pow(10, exponentSign * exponent)
    }
    number *= sign
    return [number, input.slice(result[0].length)]
  }
}

function defineInterpreter (input, scope) {
  let result = /^define/.exec(input) // and expects a symbol and expression
  if (result === null) {
    return null
  } else {
    input = input.slice(6)
    let subblocks = atomizer(input)
    if (subblocks.length !== 2) {
      throw new SyntaxError('Incorrect number of arguments for define')
    } else if (subblocks[0] in globalEnvironment) {
      throw new SyntaxError('Variable already defined by this name')
    } else {
      globalEnvironment[subblocks[0]] = mainInterpreter(subblocks[1], scope)
    }
  } return [null, '']
}

function ifInterpreter (input, scope) {
  let result = /^if/.exec(input) // and expects a test, conseq and alt
  if (result === null) {
    return null
  } else {
    input = input.slice(2)
    let subblocks = atomizer(input)
    if (subblocks.length !== 3) {
      throw new SyntaxError('Incorrect number of arguments for if')
    } else if (mainInterpreter(subblocks[0], scope)) {
      return [mainInterpreter(subblocks[1], scope), '']
    } else {
      return [mainInterpreter(subblocks[2], scope), '']
    }
  }
}

function quoteInterpreter (input, scope) {
  let result = /^quote/.exec(input) // and expects an expression
  if (result === null) {
    return null
  } else {
    input = input.slice(5)
    let subblocks = atomizer(input)
    if (subblocks.length !== 1) {
      throw new SyntaxError('Incorrect number of arguments for quote')
    } else {
      return [subblocks[0], '']
    }
  }
}

function assignInterpreter (input, scope) {
  let result = /^set!/.exec(input) // and expects a variable and expression
  let appScope
  if (result === null) {
    return null
  } else {
    input = input.slice(4)
    let subblocks = atomizer(input)
    if (subblocks.length !== 2) {
      throw new SyntaxError('Incorrect number of arguments for set')
    }
    appScope = lookUpScope(subblocks[0], scope)
    if (appScope !== null) {
      appScope[subblocks[0]] = mainInterpreter(subblocks[1], scope)
      return [null, '']
    } else {
      throw new SyntaxError('Variable to be assigned is undefined')
    }
  }
}

function lambdaInterpreter (input, scope) {
  // console.log('lambda here', input) // DEBUG
  let result = /^lambda/.exec(input) // expects params and body
  if (result === null) {
    return null
  } else {
    input = input.slice(6)
    let subblocks = atomizer(input)
    if (subblocks.length !== 2) {
      throw new SyntaxError('Incorrect number of arguments for lambda')
    } else {
      return [{ 'params': subblocks[0], 'body': subblocks[1], 'scope': scope }, '']
    }
  }
}

function setOutermost (scope, attach) {
  if (attach.scope !== null) {
    if (scope === null) {
      scope = {}
      Object.assign(scope, attach.scope)
    } else if ('outer' in scope) {
      setOutermost(scope['outer'], attach)
    } else {
      scope['outer'] = {}
      Object.assign(scope['outer'], attach.scope)
    }
  }
}

function funcCall (func, args, scope) {
  if (typeof func === 'object') {
    let params = func.params.replace(/[)(]/g, '').split(' ')
    if (params.length !== args.length) {
      throw new SyntaxError('Invalid number of arguments supplied')
    }
    let localscope
    if (params.length === 0) {
      if (scope === null) {
        localscope = null
      } else {
        localscope = {}
        Object.assign(localscope, scope)
      }
    } else {
      if (scope === null) {
        localscope = {}
      } else {
        localscope = { 'outer': {} }
        Object.assign(localscope['outer'], scope)
      }
      for (let i = 0; i < params.length; i++) {
        localscope[params[i]] = args[i]
      }
    }
    setOutermost(localscope, func)
    return [mainInterpreter(func.body, localscope), '']
  } else {
    // console.log(func, args, 'result is', func(...args)) // DEBUG
    return [func(...args), '']
  }
}

function procInterpreter (input, scope) { // function calls
  // console.log('proc run', input) // DEBUG
  // console.log('proc here', JSON.stringify(scope)) // DEBUG
  let result = /^\S+/.exec(input)
  let args = []
  let execFunction = lookUpValue(result[0], scope)
  let subblocks
  // console.log('execFunction is', execFunction) // DEBUG
  if (execFunction === null) {
    result = /^[(]/.exec(input)
    if (result === null) {
      return null
    } else {
      subblocks = atomizer('(' + input)
      execFunction = mainInterpreter(subblocks[0], scope)
      for (let i = 1; i < subblocks.length; i++) {
        args.push(mainInterpreter(subblocks[i], scope))
      }
      return funcCall(execFunction, args, scope)
    }
  } else {
    input = input.slice(result[0].length)
    subblocks = atomizer(input)
    for (let block of subblocks) {
      args.push(mainInterpreter(block, scope))
    }
    return funcCall(execFunction, args, scope)
  }
}

function repl () {
  var stdin = process.openStdin()
  stdin.addListener('data', function (text) {
    try {
      let response = mainInterpreter(text.toString().trim(), null)
      if (response != null) {
        console.log(JSON.stringify(response))
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.log(err.message)
      } else {
        console.log(err)
      }
    }
  })
}

repl()

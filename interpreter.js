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
  'cons': (a, b) => [a] + b,
  'equal?': (a, b) => a === b,
  'list': toArray
} // store any defines here

function interpreterLoop (input, interpreters, environment) {
  let value
  let returned
  for (let interpreter of interpreters) {
    returned = interpreter(input, environment)
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

function mainInterpreter (input, environment) { // call this
  const interpreters = [blockInterpreter, variableInterpreter, constantInterpreter]
  let result = interpreterLoop(input, interpreters, environment)
  return result[0]
}

function blockInterpreter (input, environment) {
  const interpreters = [defineInterpreter, ifInterpreter, quoteInterpreter, lambdaInterpreter, assignInterpreter, procInterpreter]
  let result = /^[(]/.exec(input)
  if (result === null) {
    return null
  } else {
    input = input.slice(1)
    return interpreterLoop(input, interpreters, environment)
  }
}

function bracketProcessor (input) { // finds the bracket enclosed block
  let openBrackets = 1
  let index = 2
  while (openBrackets > 0) {
    if (input[index] === '(') {
      openBrackets++
    } else if (input[index] === ')') {
      openBrackets--
    } index++
  } return [input.slice(1, index), input.slice(index)]
}

function atomizer (input) { // breaks input into subblocks
  let subblocks = []
  let result
  while (input !== ')') {
    if (/^ [(]/.test(input) === true) {
      result = bracketProcessor(input)
      subblocks.push(result[0])
      input = result[1]
    } else {
      result = /^ [^ )]+/.exec(input)
      if (result === null) {
        throw new SyntaxError('This is not a valid sub block')
      } else {
        subblocks.push(result[0].replace(' ', ''))
        input = input.slice(result[0].length)
      }
    }
  } return subblocks
}

function variableInterpreter (input, environment) {
  if (Object.keys(environment).length !== 0) {
    if (input in environment) {
      return [environment[input], '']
    }
  }
  if (input in globalEnvironment) {
    return [globalEnvironment[input], '']
  } else {
    return null
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

function constantInterpreter (input, environment) {
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

function defineInterpreter (input, environment) {
  let result = /^define/.exec(input) // and expects a symbol and expression
  if (result === null) {
    return null
  } else {
    input = input.slice(6)
    let subblocks = atomizer(input)
    if (subblocks.length !== 2) {
      throw new SyntaxError('Incorrect number of arguments for define')
    } else {
      globalEnvironment[subblocks[0]] = mainInterpreter(subblocks[1], environment)
    }
  } return [null, '']
}

function ifInterpreter (input, environment) {
  let result = /^if/.exec(input) // and expects a test, conseq and alt
  if (result === null) {
    return null
  } else {
    input = input.slice(2)
    let subblocks = atomizer(input)
    if (subblocks.length !== 3) {
      throw new SyntaxError('Incorrect number of arguments for if')
    } else if (mainInterpreter(subblocks[0], environment)) {
      return [mainInterpreter(subblocks[1], environment), '']
    } else {
      return [mainInterpreter(subblocks[2], environment), '']
    }
  }
}

function quoteInterpreter (input, environment) {
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

function assignInterpreter (input, environment) {
  let result = /^set!/.exec(input) // and expects a variable and expression
  if (result === null) {
    return null
  } else {
    input = input.slice(4)
    let subblocks = atomizer(input)
    if (subblocks.length !== 2) {
      throw new SyntaxError('Incorrect number of arguments for assign')
    } else if (Object.keys(environment).length !== 0) {
      if (subblocks[0] in environment) {
        environment[subblocks[0]] = mainInterpreter(subblocks[1], environment) // check
        return [null, '']
      }
    } else if (subblocks[0] in globalEnvironment) {
      globalEnvironment[subblocks[0]] = mainInterpreter(subblocks[1], environment) // check
      return [null, '']
    } else {
      throw new SyntaxError('Variable to be assigned is undefined')
    }
  }
}

function lambdaInterpreter (input, environment) {
  let result = /^lambda/.exec(input) // expects params and body
  if (result === null) {
    return null
  } else {
    input = input.slice(6)
    let subblocks = atomizer(input)
    if (subblocks.length !== 2) {
      throw new SyntaxError('Incorrect number of arguments for lambda')
    } else {
      if (Object.keys(environment).length !== 0) {
        for (let variable of Object.keys(environment)) {
          let exp = new RegExp('\b' + variable + '\b', 'g')
          subblocks[1] = subblocks[1].replace(exp, environment[variable])
        } // goes through body and replaces all matches in environment
      }
      return [{ 'params': subblocks[0], 'body': subblocks[1] }, '']
    }
  }
}

function procInterpreter (input, environment) { // function calls
  let result = /^\S+/.exec(input)
  let args = []
  let found = false
  let execFunction
  if (Object.keys(environment).length !== 0) {
    if (result[0] in environment) {
      execFunction = environment[result[0]]
      found = true
    }
  } if (!found & result[0] in globalEnvironment) {
    execFunction = globalEnvironment[result[0]]
    found = true
  } if (found) {
    input = input.slice(result[0].length)
    let subblocks = atomizer(input)
    for (let block of subblocks) {
      args.push(mainInterpreter(block, environment))
    }
    if (typeof execFunction === 'object') {
      let localscope = {}
      Object.assign(localscope, environment)
      let params = execFunction.params.replace(/[)(]/g, '').split(' ')
      for (let i = 0; i < params.length; i++) {
        localscope[params[i]] = args[i]
      }
      return [mainInterpreter(execFunction.body, localscope), '']
    } else {
      return [execFunction(...args), '']
    }
  } else {
    return null
  }
}

function repl () {
  var stdin = process.openStdin()
  stdin.addListener('data', function (text) {
    try {
      let response = mainInterpreter(text.toString().trim(), {})
      if (response != null) {
        console.log(response)
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

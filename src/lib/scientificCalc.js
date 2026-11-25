// Pure scientific calculator: tokenizer, recursive-descent parser and evaluator.
// No platform imports and no eval, so the same module runs in Node tests and in the app.

const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt', 'abs', 'exp']);
const CONSTANTS = new Map([
  ['pi', Math.PI],
  ['e', Math.E],
]);

// 170! is the largest factorial that fits in a double.
const MAX_FACTORIAL = 170;

const NUMBER_RE = /\d+\.?\d*|\.\d+/y;
const WORD_RE = /[A-Za-z]+/y;
const OPERATORS = new Set(['+', '-', '*', '/', '^', '!', '(', ')']);

// Splits text into tokens. Every token has a `text` for error messages.
function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    NUMBER_RE.lastIndex = i;
    const number = NUMBER_RE.exec(text);
    if (number) {
      const value = Number(number[0]);
      if (!Number.isFinite(value)) throw new Error('Number is too large');
      tokens.push({ type: 'num', value, text: number[0] });
      i += number[0].length;
      continue;
    }
    WORD_RE.lastIndex = i;
    const word = WORD_RE.exec(text);
    if (word) {
      const name = word[0].toLowerCase();
      if (!CONSTANTS.has(name) && !FUNCTIONS.has(name)) {
        throw new Error(`Unknown word: ${word[0]}`);
      }
      tokens.push({ type: 'name', value: name, text: word[0] });
      i += word[0].length;
      continue;
    }
    if (OPERATORS.has(ch)) {
      tokens.push({ type: 'op', value: ch, text: ch });
      i++;
      continue;
    }
    throw new Error(`Unknown symbol: ${ch}`);
  }
  return tokens;
}

const isOp = (tok, op) => tok !== undefined && tok.type === 'op' && tok.value === op;
const startsOperand = (tok) =>
  tok !== undefined && (tok.type === 'num' || tok.type === 'name' || isOp(tok, '('));

// Grammar, lowest to highest precedence:
//   sum     = product (('+' | '-') product)*
//   product = unary (('*' | '/') unary)*
//   unary   = ('-' | '+') unary | power
//   power   = postfix ('^' unary)?          right-associative, so 2^3^2 = 2^9
//   postfix = primary '!'*
//   primary = number | constant | function '(' sum ')' | '(' sum ')'
// Unary minus sits below ^, so -2^2 = -(2^2) = -4.
function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];

  function sum() {
    let node = product();
    while (isOp(peek(), '+') || isOp(peek(), '-')) {
      const op = take().value;
      node = { type: 'binary', op, left: node, right: product() };
    }
    return node;
  }

  function product() {
    let node = unary();
    while (isOp(peek(), '*') || isOp(peek(), '/')) {
      const op = take().value;
      node = { type: 'binary', op, left: node, right: unary() };
    }
    return node;
  }

  function unary() {
    if (isOp(peek(), '-')) {
      take();
      return { type: 'neg', arg: unary() };
    }
    if (isOp(peek(), '+')) {
      take();
      return unary();
    }
    return power();
  }

  function power() {
    const base = postfix();
    if (isOp(peek(), '^')) {
      take();
      return { type: 'binary', op: '^', left: base, right: unary() };
    }
    return base;
  }

  function postfix() {
    let node = primary();
    while (isOp(peek(), '!')) {
      take();
      node = { type: 'fact', arg: node };
    }
    return node;
  }

  // Called after '(' has been taken. Reads the inside and the closing ')'.
  function group() {
    const inner = sum();
    const tok = peek();
    if (tok === undefined) throw new Error('Brackets do not match');
    if (!isOp(tok, ')')) throw new Error(`Missing operator before ${tok.text}`);
    take();
    return inner;
  }

  function primary() {
    const tok = take();
    if (tok === undefined) throw new Error('Expression is incomplete');
    if (tok.type === 'num') return { type: 'num', value: tok.value };
    if (tok.type === 'name') {
      if (CONSTANTS.has(tok.value)) return { type: 'num', value: CONSTANTS.get(tok.value) };
      if (!isOp(peek(), '(')) throw new Error(`${tok.text} must be followed by (`);
      take();
      return { type: 'fn', name: tok.value, arg: group() };
    }
    if (isOp(tok, '(')) return group();
    if (isOp(tok, ')')) {
      throw new Error(isOp(tokens[pos - 2], '(') ? 'Nothing inside brackets' : 'Brackets do not match');
    }
    throw new Error(`Unexpected ${tok.text}`);
  }

  const tree = sum();
  const tok = peek();
  if (tok !== undefined) {
    if (isOp(tok, ')')) throw new Error('Brackets do not match');
    if (startsOperand(tok)) throw new Error(`Missing operator before ${tok.text}`);
    throw new Error(`Unexpected ${tok.text}`);
  }
  return tree;
}

// Results that are not finite are reported as errors, never returned.
function check(value) {
  if (Number.isNaN(value)) throw new Error('Result is not a real number');
  if (!Number.isFinite(value)) throw new Error('Result is too large');
  return value;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) throw new Error('Factorial needs a whole number, 0 or more');
  if (n > MAX_FACTORIAL) throw new Error('Result is too large');
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// Degree versions of sin and cos hit exact values at multiples of 90,
// so sin(180) is 0 and not 1.2e-16.
function sinDeg(x) {
  const r = ((x % 360) + 360) % 360;
  if (r === 0 || r === 180) return 0;
  if (r === 90) return 1;
  if (r === 270) return -1;
  return Math.sin((x * Math.PI) / 180);
}

function cosDeg(x) {
  const r = ((x % 360) + 360) % 360;
  if (r === 90 || r === 270) return 0;
  if (r === 0) return 1;
  if (r === 180) return -1;
  return Math.cos((x * Math.PI) / 180);
}

function callFunction(name, x, angle) {
  const deg = angle === 'deg';
  const toAngle = (radians) => (deg ? (radians * 180) / Math.PI : radians);
  switch (name) {
    case 'sin':
      return deg ? sinDeg(x) : Math.sin(x);
    case 'cos':
      return deg ? cosDeg(x) : Math.cos(x);
    case 'tan': {
      if (deg) {
        const r = ((x % 180) + 180) % 180;
        if (r === 0) return 0;
        if (r === 90) throw new Error('tan is not defined at this angle');
        return Math.tan((x * Math.PI) / 180);
      }
      if (Math.abs(Math.cos(x)) < 1e-12) throw new Error('tan is not defined at this angle');
      return Math.tan(x);
    }
    case 'asin':
      if (x < -1 || x > 1) throw new Error('asin needs a number from -1 to 1');
      return toAngle(Math.asin(x));
    case 'acos':
      if (x < -1 || x > 1) throw new Error('acos needs a number from -1 to 1');
      return toAngle(Math.acos(x));
    case 'atan':
      return toAngle(Math.atan(x));
    case 'log':
      if (x <= 0) throw new Error('log needs a number above 0');
      return Math.log10(x);
    case 'ln':
      if (x <= 0) throw new Error('ln needs a number above 0');
      return Math.log(x);
    case 'sqrt':
      if (x < 0) throw new Error('sqrt needs a number of 0 or more');
      return Math.sqrt(x);
    case 'abs':
      return Math.abs(x);
    case 'exp':
      return check(Math.exp(x));
    default:
      throw new Error(`Unknown word: ${name}`);
  }
}

function binary(op, a, b) {
  switch (op) {
    case '+':
      return check(a + b);
    case '-':
      return check(a - b);
    case '*':
      return check(a * b);
    case '/':
      if (b === 0) throw new Error('Cannot divide by zero');
      return check(a / b);
    case '^':
      if (a === 0 && b < 0) throw new Error('Cannot divide by zero');
      return check(Math.pow(a, b));
    default:
      throw new Error(`Unknown operator: ${op}`);
  }
}

function evalNode(node, angle) {
  switch (node.type) {
    case 'num':
      return node.value;
    case 'neg':
      return -evalNode(node.arg, angle);
    case 'fact':
      return factorial(evalNode(node.arg, angle));
    case 'binary': {
      const a = evalNode(node.left, angle);
      const b = evalNode(node.right, angle);
      return binary(node.op, a, b);
    }
    case 'fn':
      return callFunction(node.name, evalNode(node.arg, angle), angle);
    default:
      throw new Error(`Unknown expression part: ${node.type}`);
  }
}

// Evaluates an expression. `angle` is 'deg' or 'rad' and sets the units for
// sin, cos, tan (input) and asin, acos, atan (output). Throws Error on bad input.
export function evaluate(expression, { angle = 'rad' } = {}) {
  if (typeof expression !== 'string') throw new TypeError('evaluate: expression must be a string');
  if (angle !== 'deg' && angle !== 'rad') throw new Error(`angle must be deg or rad, got ${angle}`);
  if (expression.trim() === '') throw new Error('Type an expression first.');
  try {
    return evalNode(parse(tokenize(expression)), angle);
  } catch (error) {
    // Very deep brackets overflow the parser's call stack.
    if (error instanceof RangeError) throw new Error('Expression is too complicated');
    throw error;
  }
}

// Up to 10 significant digits, with no trailing zeros.
// Very large or very small numbers use exponent form, such as 1.5e+21.
export function formatResult(number) {
  if (!Number.isFinite(number)) return String(number);
  if (number === 0) return '0';
  const [mantissa, exponent] = number.toPrecision(10).split('e');
  const trimmed = mantissa.includes('.') ? mantissa.replace(/0+$/, '').replace(/\.$/, '') : mantissa;
  return exponent === undefined ? trimmed : `${trimmed}e${exponent}`;
}

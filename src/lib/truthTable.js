// Truth tables for logic expressions. Pure JavaScript, offline.
// Operators, from tightest to loosest binding: NOT, AND, XOR, OR. Brackets group.
// Variables are single letters (A to Z); lower case is treated as capital.
// Each operator also has a word form (NOT, AND, XOR, OR), matched case-insensitively.
export const MAX_VARIABLES = 6;

const SYMBOLS = { '&': 'AND', '|': 'OR', '^': 'XOR', '!': 'NOT', '~': 'NOT' };
const WORDS = new Set(['AND', 'OR', 'NOT', 'XOR']);

function tokenize(text) {
  const src = text ?? '';
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (ch === '(' || ch === ')') {
      tokens.push({ type: ch });
      i++;
    } else if (SYMBOLS[ch]) {
      tokens.push({ type: 'op', op: SYMBOLS[ch] });
      i++;
    } else if (ch === '0' || ch === '1') {
      tokens.push({ type: 'const', value: ch === '1' });
      i++;
    } else if (/[A-Za-z]/.test(ch)) {
      let end = i;
      while (end < src.length && /[A-Za-z]/.test(src[end])) end++;
      const word = src.slice(i, end).toUpperCase();
      if (WORDS.has(word)) {
        tokens.push({ type: 'op', op: word });
      } else if (word.length === 1) {
        tokens.push({ type: 'var', name: word });
      } else {
        throw new Error(`Unknown word: ${src.slice(i, end)}. Use single letters for variables, and AND, OR, NOT, XOR for operators.`);
      }
      i = end;
    } else {
      throw new Error(`Unknown character: ${ch}`);
    }
  }
  return tokens;
}

function describe(token) {
  if (token.type === 'var') return token.name;
  if (token.type === 'const') return token.value ? '1' : '0';
  if (token.type === 'op') return token.op;
  return token.type;
}

// Reads the expression into a tree. Throws a plain message when it is not valid.
export function parseLogic(text) {
  const tokens = tokenize(text);
  if (tokens.length === 0) throw new Error('Type an expression, such as A & (B | !C).');
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (op) => peek()?.type === 'op' && peek().op === op;

  function parseBinary(op, parseOperand) {
    let left = parseOperand();
    while (isOp(op)) {
      pos++;
      left = { type: 'bin', op, left, right: parseOperand() };
    }
    return left;
  }

  function parseOr() {
    return parseBinary('OR', parseXor);
  }

  function parseXor() {
    return parseBinary('XOR', parseAnd);
  }

  function parseAnd() {
    return parseBinary('AND', parseNot);
  }

  function parseNot() {
    if (isOp('NOT')) {
      pos++;
      return { type: 'not', arg: parseNot() };
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error('The expression ends too soon. Something is missing at the end.');
    if (token.type === 'var') {
      pos++;
      return { type: 'var', name: token.name };
    }
    if (token.type === 'const') {
      pos++;
      return { type: 'const', value: token.value };
    }
    if (token.type === '(') {
      pos++;
      const inner = parseOr();
      if (peek()?.type !== ')') throw new Error('Brackets do not match. Add a closing ).');
      pos++;
      return inner;
    }
    throw new Error(`"${describe(token)}" needs a variable or a bracket before it.`);
  }

  const tree = parseOr();
  if (pos < tokens.length) {
    throw new Error(`"${describe(tokens[pos])}" is in the wrong place. Use & or AND between variables.`);
  }
  return tree;
}

// The variables used, sorted alphabetically.
export function variablesOf(tree) {
  const names = new Set();
  const walk = (node) => {
    if (node.type === 'var') names.add(node.name);
    if (node.type === 'not') walk(node.arg);
    if (node.type === 'bin') {
      walk(node.left);
      walk(node.right);
    }
  };
  walk(tree);
  return [...names].sort();
}

function evaluateTree(node, values) {
  switch (node.type) {
    case 'var':
      return values[node.name];
    case 'const':
      return node.value;
    case 'not':
      return !evaluateTree(node.arg, values);
    case 'bin': {
      const a = evaluateTree(node.left, values);
      const b = evaluateTree(node.right, values);
      if (node.op === 'AND') return a && b;
      if (node.op === 'OR') return a || b;
      return a !== b; // XOR
    }
    default:
      throw new Error('Unknown part of the expression.');
  }
}

// Every row of the table, in standard order: the first variable changes slowest.
// Returns { variables, rows: [{ values, result }] }. Throws above MAX_VARIABLES.
export function truthTable(text) {
  const tree = parseLogic(text);
  const variables = variablesOf(tree);
  if (variables.length > MAX_VARIABLES) {
    throw new Error(`Up to ${MAX_VARIABLES} variables. This expression uses ${variables.length}.`);
  }
  const rows = [];
  const count = 2 ** variables.length;
  for (let row = 0; row < count; row++) {
    const values = {};
    variables.forEach((name, i) => {
      values[name] = Boolean((row >> (variables.length - 1 - i)) & 1);
    });
    rows.push({ values, result: evaluateTree(tree, values) });
  }
  return { variables, rows };
}

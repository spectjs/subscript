export let index, current, lastOp

export const code = () => current.charCodeAt(index), // current char code
char = (n=1) => current.substr(index, n), // next n chars
err = (msg) => { throw Error(msg + ' at ' + index) },
next = (is, from=index, n) => { // number indicates skip & stop (don't check)
  if (typeof is === 'number') index += is
  else while (is(code())) ++index > current.length && err('Unexpected end ' + is) // 1 + true === 2;
  return index > from ? current.slice(from, index) : null
},
space = () => { while (code() <= 32) index++ },
map = (node, t=parse.map[node[0]]) => t ? t(node) : node,

// consume operator that resides within current group by precedence
operator = (ops, op, prec, l=3) => {
  // memoize by index - saves 20% to perf
  if (index && lastOp && lastOp[3] === index) return lastOp

  // ascending lookup is faster 1-char operators, longer for 2+ char ops
  while (l) if ((prec=ops[op=char(l--)])!=null) return lastOp = [op, prec, op.length, index] //opinfo
},

// `foo.bar(baz)`, `1`, `"abc"`, `(a % 2)`
expr = (end, prec=-1) => {
  space()

  let cc = code(), op, c = char(), node, from=index, arg
  const PERIOD = 46, OPAREN = 40, CPAREN = 41, OBRACK = 91, CBRACK = 93

  // parse node by token parsers
  parse.token.find(token => (node = token()) != null)

  // unary
  if (node == null) (op = operator(parse.prefix)) && (index += op[2], node = map([op[0], expr(end, op[1])]))

  // literal
  else if (typeof node === 'string' && parse.literal.hasOwnProperty(node)) node = parse.literal[node]

  // chain, a.b[c](d).e − can be treated as single token. Faster & shorter than making ([. a separate operator
  else {
    space()
    while ( cc = code(), cc === PERIOD || cc === OPAREN || cc === OBRACK ) { // .([
      index++
      if (cc === PERIOD) space(), node = map(['.', node, id()])
      else if (cc === OBRACK) node = map(['[', node, expr(CBRACK)]), index++
      else if (cc === OPAREN) node = map(['(', node, expr(CPAREN)]), index++
      space()
    }
  }

  space()

  // consume expression for current precedence or group (== highest precedence)
  while ((cc = code()) && cc !== end && (op = operator(parse.binary)) && op[1] > prec) {
    node = [op[0], node]
    // consume same-op group, do..while both saves op lookups and space
    do { index += op[2], node.push(expr(end, op[1])) } while (char(op[2]) === op[0])
    node = map(node)
    space()
  }

  return node;
},

// tokens
// 1.2e+3, .5
float = (number, c, isDigit) => {
  number = next(isDigit = c => c >= 48 && c <= 57) || ''
  if (code() === 46) index++, number += '.' + next(isDigit)
  if (number) {
    if ((c = code()) === 69 || c === 101) { // e, E
      index++, number += 'e'
      if ((c=code()) === 43 || c === 45) // +-
        number += char(), index++
      number += next(isDigit)
    }
    return parseFloat(number)
  }
},

// "a", 'b'
string = (q=code(), qc) => (q === 34 || q === 39) ? (qc = char(), index++, qc) + next(c => c !== q) + (index++, qc) : null,

// (...exp)
group = (open=40, end=41, node) => code() === open ? (index++, node = expr(end), index++, node) : null,

id = () => next(c =>
  (c >= 48 && c <= 57) || // 0..9
  (c >= 65 && c <= 90) || // A...Z
  (c >= 97 && c <= 122) || // a...z
  c == 36 || c == 95 || // $, _,
  c >= 192 // any non-ASCII
),

parse = Object.assign(
  str => (current=str, index=lastOp=0, expr()),
  {
    token: [ group, float, string, id ],

    literal: {
      true: true,
      false: false,
      null: null
    },

    prefix: {
      '-': 10,
      '!': 10,
      '+': 10,
      '++': 10,
      '--': 10
    },
    postfix: {
      '++': 10,
      '--': 10
    },
    binary: {
      ',': 0,
      '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5,
      '==': 6, '!=': 6,
      '<': 7, '>': 7, '<=': 7, '>=': 7,
      '<<': 8, '>>': 8, '>>>': 8,
      '+': 9, '-': 9,
      '*': 10, '/': 10, '%': 10
    },
    map: {
      '.': ([op, obj, prop]) => [op, obj, '"'+prop+'"'],
      '[': (node) => (node[0]='.', node),
      '(': ([op, fn, arg]) => Array.isArray(arg) && arg[0]===','? (arg[0]=fn, arg) : arg == null ? [fn] : [fn, arg]
    }
  }
)

export default parse

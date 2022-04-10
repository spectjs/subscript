// justin lang https://github.com/endojs/Jessie/issues/66
import parse, { skip, cur, idx, err, expr } from './parse.js'
import compile from './compile.js'
import subscript, {unary, binary, nary, token} from './subscript.js'

const PERIOD=46, OPAREN=40, CPAREN=41, OBRACK=91, CBRACK=93, SPACE=32, DQUOTE=34, QUOTE=39, _0=48, _9=57, BSLASH=92,
PREC_SEQ=1, PREC_COND=3, PREC_SOME=4, PREC_EVERY=5, PREC_OR=6, PREC_XOR=7, PREC_AND=8,
PREC_EQ=9, PREC_COMP=10, PREC_SHIFT=11, PREC_SUM=12, PREC_MULT=13, PREC_EXP=14, PREC_UNARY=15, PREC_POSTFIX=16, PREC_CALL=18, PREC_GROUP=19


// operators
binary('===',  PREC_EQ, (a,b) => a===b)
binary('!==',  PREC_EQ, (a,b) => a!==b)
unary('~',  PREC_UNARY, (a) => ~a)

// ?:
token('?', PREC_COND,
  (a, b, c) => a && (b=expr(2,58)) && (c=expr(3), ['?', a, b, c]),
  (a, b, c) => (a=compile(a),b=compile(b),c=compile(c), ctx => a(ctx) ? b(ctx) : c(ctx))
)
// a ?? b
binary('??', PREC_OR, (a,b) => a ?? b)

// a?.[, a?.( - postfix operator
token('?.', PREC_CALL, a => a && ['?.', a], a => (a=compile(a), ctx => a(ctx)||(()=>{})))
// a?.b - optional chain operator
token('?.', PREC_CALL,
  (a,b) => a && (b=expr(PREC_CALL),!b?.map) && ['?.',a,b],
  (a,b) => b && (a=compile(a), ctx => a(ctx)?.[b])
)

binary('in', PREC_COMP , (a,b) => a in b)

// "' with /
let escape = {n:'\n', r:'\r', t:'\t', b:'\b', f:'\f', v:'\v'},
  string = q => (qc, c, str='') => {
    qc&&err('Unexpected string') // must not follow another token
    skip()
    while (c=cur.charCodeAt(idx), c-q) {
      if (c === BSLASH) skip(), c=skip(), str += escape[c] || c
      else str += skip()
    }
    skip()
    return ['', str]
  }
parse.lookup[DQUOTE] = string(DQUOTE)
parse.lookup[QUOTE] = string(QUOTE)

// /**/, //
parse.token('/*', 20, (a, prec) => (skip(c => c !== 42 && cur.charCodeAt(idx+1) !== 47), skip(2), a||expr(prec)))
parse.token('//', 20, (a, prec) => (skip(c => c >= 32), a||expr(prec)))

// literals
parse.token('null', 20, a => a ? err() : ['',null])
parse.token('true', 20, a => a ? err() : ['',true])
parse.token('false', 20, a => a ? err() : ['',false])
parse.token('undefined', 20, a => a ? err() : ['',undefined])

// FIXME: make sure that is right
parse.token(';', 20, a => expr()||[''])

// right order
// '**', (a,prec,b=expr(PREC_EXP-1)) => ctx=>a(ctx)**b(ctx), PREC_EXP,
binary('**', -PREC_EXP, (a,b)=>a**b)

// [a,b,c]
token('[', 20,
  (a) => !a && ['[', expr(0,93)||''],
  (a,b) => !b && (
    !a ? () => [] : // []
      a[0] === ',' ? (a=a.slice(1).map(compile), ctx => a.map(a=>a(ctx))) : // [a,b,c]
      (a=compile(a), ctx => [a(ctx)]) // [a]
  )
)

// {a:1, b:2, c:3}
token('{', 20,
    a => !a && (['{', expr(0,125)||'']),
    (a,b) => (
      !a ? ctx => ({}) : // {}
      a[0] === ',' ? (a=a.slice(1).map(compile), ctx=>Object.fromEntries(a.map(a=>a(ctx)))) : // {a:1,b:2}
      a[0] === ':' ? (a=compile(a), ctx => Object.fromEntries([a(ctx)])) : // {a:1}
      (b=compile(a), ctx=>({[a]:b(ctx)}))
    )
)

token(':', 1.1,
  (a, b) => (b=expr(1.1)||err(), [':',a,b]),
  (a,b) => (b=compile(b),a=Array.isArray(a)?compile(a):(a=>a).bind(0,a), ctx=>[a(ctx),b(ctx)])
)

export default subscript
export * from './subscript.js'

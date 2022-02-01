// justin lang https://github.com/endojs/Jessie/issues/66
import {set, lookup, skip, cur, idx, err, expr, isId, space, args} from './parser.js'
export { default } from './subscript.js'

const PERIOD=46, OPAREN=40, CPAREN=41, OBRACK=91, CBRACK=93, SPACE=32, DQUOTE=34, QUOTE=39, _0=48, _9=57, BSLASH=92,
PREC_SEQ=1, PREC_COND=3, PREC_SOME=4, PREC_EVERY=5, PREC_OR=6, PREC_XOR=7, PREC_AND=8,
PREC_EQ=9, PREC_COMP=10, PREC_SHIFT=11, PREC_SUM=12, PREC_MULT=13, PREC_EXP=14, PREC_UNARY=15, PREC_POSTFIX=16, PREC_CALL=18, PREC_GROUP=19


let u, list, op, prec, fn,
    escape = {n:'\n', r:'\r', t:'\t', b:'\b', f:'\f', v:'\v'},
    string = q => (qc, c, str='') => {
      qc&&err('Unexpected string') // must not follow another token
      while (c=cur.charCodeAt(idx), c-q) {
        if (c === BSLASH) skip(), c=skip(), str += escape[c] || c
        else str += skip()
      }
      return skip()||err('Bad string'), () => str
    }

// operators
for (list=[
  // "' with /
  '"', string(DQUOTE),,
  "'", string(QUOTE),,

  // /**/, //
  '/*', (a, prec) => (skip(c => c !== 42 && cur.charCodeAt(idx+1) !== 47), skip(2), a||expr(prec)),,
  '//', (a, prec) => (skip(c => c >= 32), a||expr(prec)),,

  // literals
  'null', a => a ? err('Unexpected literal') : ()=>null,,
  'true', a => a ? err('Unexpected literal') : ()=>true,,
  'false', a => a ? err('Unexpected literal') : ()=>false,,
  'undefined', a => a ? err('Unexpected literal') : ()=>undefined,,

  ';', a => expr()||(()=>{}),,

  // operators
  '===', PREC_EQ, (a,b) => a===b,
  '!==', PREC_EQ, (a,b) => a!==b,
  '~', PREC_UNARY, (a) => ~a,

  // right order
  '**', (a,prec,b=expr(PREC_EXP-1)) => ctx=>a(ctx)**b(ctx), PREC_EXP,

  // ?:
  ':', 3.1, (a,b) => [a,b],
  '?', 3, (a,b) => a ? b[0] : b[1],

  '??', PREC_OR, (a,b) => a??b,

  // a?.[, a?.( - postfix operator
  '?.', a => a && (ctx => a(ctx)||(()=>{})),,//(a) => a||(()=>{}),
  // a?.b - optional chain operator
  '?.', (a,id) => (space(), id=skip(isId)) && (ctx => a(ctx)?.[id]),,

  'in', PREC_COMP, (a,b) => a in b,

  // [a,b,c]
  '[', (a) => !a && (
    a=expr(0,CBRACK),
    !a ? ctx => [] : a.all ? ctx => a.all(ctx) : ctx => [a(ctx)]
  ),,

  // {a:1, b:2, c:3}
  '{', (a, entries) => !a && (
      a=expr(0,125),
      !a ? ctx => ({}) : ctx => (entries=(a.all||a)(ctx), Object.fromEntries(a.all?entries:[entries]))
    ),,
  // for JSON case we should not collect arg (different evaluator than ternary)
  ':', (a, prec, b) => (b=expr(1.1)||err(), a.id&&args.pop(), ctx => [(a.id||a)(ctx), b(ctx)]), 1.1
  // FIXME: make conditional result depending on passed precision

]; [op,prec,fn,...list]=list, op;) set(op,prec,fn)

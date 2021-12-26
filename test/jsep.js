import test, {is, any, throws} from '../lib/test.js'
import script from '../justin.js'
// import { skip, code, expr, char, operator } from '../justin.js'

test('Expression: Constants', ()=> {
  is(script('\'abc\'')(),  "abc" );
  is(script('"abc"')(),  'abc' );
  is(script('123')(),  123 );
  is(script('12.3')(),  12.3 );
});

test('String escapes', () => {
  is(script("'a \\w b'")(), "a w b")
  is(script("'a \\' b'")(), "a ' b")
  is(script("'a \\n b'")(), "a \n b")
  is(script("'a \\r b'")(), "a \r b")
  is(script("'a \\t b'")(), "a \t b")
  is(script("'a \\b b'")(), "a \b b")
  is(script("'a \\f b'")(), "a \f b")
  is(script("'a \\v b'")(), "a \v b")
  is(script("'a \\\ b'")(), "a \ b")
});

test('Variables', ()=> {
  is(script('abc')({abc:123}), 123);
  is(script('a.b[c[0]]')({a:{b:[1]}, c:[0]}), 1);
  is(script('Δέλτα')({Δέλτα:123}), 123);
});
test('Question operator', () => {
  is(script('a?.b')({a:{b:1}}), 1);
  is(script('a?.b')({a:2}), undefined);
  is(script('a?.[1]')({a:[,1]}), 1);
  is(script('a?. [1]')({a:[,1]}), 1);
  is(script('a?.[1]')({}), undefined);
  is(script('a?.(1)')({a:v=>v}), 1);
  is(script('a?. (1)')({a:v=>v}), 1);
  is(script('a?.(1,2)')({a:(v,w)=>v+w}), 3);
  is(script('a?.()')({a:v=>1}), 1);
  is(script('a?.(1)')({}), undefined);
  is(script('a?.b?.(arg)?.[c] ?. d')({a:{b:d=>[,,{d}]}, arg:1, c:2}), 1);
})

test('Function Calls', ()=> {
  is(script("a(b, c(d,e), f)")({a: (b,c,f) => b+c+f, b:1, c:(d,e)=>d+e, f:2, d:3, e:4}), 10)
  throws(t => script('a b + c'))
  is(script("'a'.toString()")(), 'a')
  is(script('[1].length')(), 1)
  is(script(';')(), {})
  // // allow all spaces or all commas to separate arguments
  // is(script('check(a, b, c, d)'), {})
  throws(t => script('check(a b c d)'))
});

test('Arrays', ()=> {
  is(script('[]')(), []);
  is(script('[a]')({a:1}), [1]);
});

test('Ops', function (qunit) {
  // script.binary['**'] = 16; // ES2016, right-associative

  is(script('1')(), 1)
  is(script('1+2')(), 3)
  is(script('1*2')(), 2)
  is(script('1*(2+3)')(), 5)
  is(script('(1+2)*3')(), 9)
  is(script('(1+2)*3+4-2-5+2/2*3')(), 9)
  is(script('1 + 2-   3*  4 /8')(), 1.5)
  is(script('\n1\r\n+\n2\n')(), 3)
  is(script('1 + -2')(), -1)
  is(script('-1 + -2 * -3 * 2')(), 11)
  is(script('2 ** 3 ** 2')(), 512)
  is(script('2 ** 3 ** 4 * 5 ** 6 ** 7 * (8 + 9)')(), 2 ** 3 ** 4 * 5 ** 6 ** 7 * (8 + 9))
  is(script('(2 ** 3) ** 4 * (5 ** 6 ** 7) * (8 + 9)')(), (2 ** 3) ** 4 * (5 ** 6 ** 7) * (8 + 9))
});

test('Custom operators', ()=> {
  is(script('a^b'), ['^','a','b']);

  operator('×', 9)
  is(script('a×b'), ['×','a','b']);

  operator('or',1)
  is(script('oneWord or anotherWord'), ['or', 'oneWord', 'anotherWord']);
  throws(() => script('oneWord ordering anotherWord'));

  operator('#', 11, -1)
  is(script('#a'), ['#','a']);

  operator('not', 13, (node) => char(3) === 'not' && [skip(3), expr(12)])
  is(script('not a'), ['not', 'a']);

  throws(t => script('notes 1'));

  operator('and', 2, node => code(3) <= 32 && [skip(3), node, expr(2)])
  is(script('a and b'),['and','a','b']);
  is(script('bands'), 'bands');

  throws(t => script('b ands'));
});

test('Bad Numbers', ()=> {
  // NOTE: for custom numbers implement custom number parser
  is(script('1.')(), 1);
  throws(() => script('1.2.3')())
});

test('Missing arguments', ()=> {
  // NOTE: these cases don't matter as much, can be either for or against
  throws(() => is(script('check(,)'), ['check', null, null]));
  throws(() => is(script('check(,1,2)'), ['check', null, 1,2]));
  throws(() => is(script('check(1,,2)'), ['check', 1,null,2]));
  throws(() => is(script('check(1,2,)'), ['check', 1,2, null]));
  throws(() => script('check(a, b c d) '), 'spaced arg after 1 comma');
  throws(() => script('check(a, b, c d)'), 'spaced arg at end');
  throws(() => script('check(a b, c, d)'), 'spaced arg first');
  throws(() => script('check(a b c, d)'), 'spaced args first');
});

test('Uncompleted expression-call/array', ()=> {
  throws(() => console.log(script('(a,b')))
  throws(() => console.log(script('myFunction(a,b')), 'detects unfinished expression call');

  throws(() => script('[1,2'), 'detects unfinished array');

  throws(() => script('-1+2-'), 'detects trailing operator');
});

test(`should throw on invalid expr`, () => {
  throws(() => console.log(script('!')))
  throws(() => console.log(script('*x')))
  throws(() => console.log(script('||x')))
  throws(() => console.log(script('?a:b')))
  throws(() => console.log(script('.')))
  throws(() => console.log(script('()()')))
    // '()', should throw 'unexpected )'...
  throws(() => console.log(script('() + 1')))
});

test('Esprima Comparison', ()=> {
  // is(script('[1,,3]'), [1,null,3])
  // is(script('[1,,]'), [])

  is(script(' true')(), true)
  is(script('false ')(), false)
  is(script(' 1.2 ')(), 1.2)
  is(script(' .2 ')(), .2)
  is(script('a')({a:'a'}), 'a')
  is(script('a .b')({a:{b:1}}), 1)
  any(script('a.b. c')({a:{b:{c:1}}}), 1)
  is(script('a [b]')({a:{b:1}, b:'b'}), 1)
  any(script('a.b  [ c ] ')({a:{b:[,1]}, c:1}), 1)
  any(script('$foo[ bar][ baz].other12 [\'lawl\'][12]')())
  any(script('$foo     [ 12  ] [ baz[z]    ].other12*4 + 1 ')())
  any(script('$foo[ bar][ baz]    (a, bb ,   c  )   .other12 [\'lawl\'][12]')())
  is(script('(a(b(c[!d]).e).f+\'hi\'==2) === true')())
  is(script('(1,2)')())
  is(script('(a, a + b > 2)')())
  is(script('a((1 + 2), (e > 0 ? f : g))')())
  is(script('(((1)))')())
  is(script('(Object.variable.toLowerCase()).length == 3')())
  is(script('(Object.variable.toLowerCase())  .  length == 3')())
  is(script('[1] + [2]')())
  is(script('"a"[0]')())
  is(script('[1](2)')())
  is(script('"a".length')())
  is(script('a.this')())
  is(script('a.true')())
});

// Should support ternary by default (index.js):
test('Ternary', ()=> {
  is(script('a ? b : c')({a:1, b:2, c: 3}), 2);
  is(script('a||b ? c : d')({a:0, b:0, c: 2, d: 3}), 3);
});


test('should allow manipulating what is considered whitespace', (assert) => {
  const expr = 'a // skip all this';
  is(script(expr)({a:'a'}), 'a');
});


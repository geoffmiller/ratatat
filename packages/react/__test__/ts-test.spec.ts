import test from 'ava'

test('TypeScript as-cast works', (t) => {
  const x = {} as any
  x.foo = 'bar'
  t.is(x.foo, 'bar')
})

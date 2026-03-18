import test from 'ava';
import Output, {OutputCaches} from '../src/output.js';

test('Output uses provided caches instance', t => {
	const caches = new OutputCaches();
	const output = new Output({
		width: 8,
		height: 1,
		caches,
	});

	output.write(0, 0, 'abc', {transformers: []});
	output.get();

	t.is((output as unknown as {caches: OutputCaches}).caches, caches);
	t.true(caches.styledChars.size > 0);
});

test('default caches are isolated per Output instance', t => {
	const output1 = new Output({
		width: 8,
		height: 1,
	});
	const output2 = new Output({
		width: 8,
		height: 1,
	});

	const output1WithCaches = output1 as unknown as {caches: OutputCaches};
	const output2WithCaches = output2 as unknown as {caches: OutputCaches};

	t.not(output1WithCaches.caches, output2WithCaches.caches);
});

test('shared caches reuse entries across Output instances', t => {
	const caches = new OutputCaches();

	const output1 = new Output({
		width: 8,
		height: 1,
		caches,
	});
	output1.write(0, 0, 'abc', {transformers: []});
	output1.get();

	const widthSizeAfterFirst = caches.widths.size;
	const styledCharsSizeAfterFirst = caches.styledChars.size;

	const output2 = new Output({
		width: 8,
		height: 1,
		caches,
	});
	output2.write(0, 0, 'abc', {transformers: []});
	output2.get();

	t.is(caches.widths.size, widthSizeAfterFirst);
	t.is(caches.styledChars.size, styledCharsSizeAfterFirst);
});

test('reset clears frame operations before next render', t => {
	const output = new Output({
		width: 8,
		height: 1,
	});

	output.write(0, 0, 'before', {transformers: []});
	t.true(output.get().output.includes('before'));

	output.reset(8, 1);
	output.write(0, 0, 'after', {transformers: []});
	const next = output.get().output;

	t.true(next.includes('after'));
	t.false(next.includes('before'));
});

test('getCharacterWidth fast-path avoids cache writes for printable ASCII and full-width chars', t => {
	const caches = new OutputCaches();

	const asciiWidth = caches.getCharacterWidth({
		type: 'char',
		value: 'A',
		fullWidth: false,
		styles: [],
	});
	const cjkWidth = caches.getCharacterWidth({
		type: 'char',
		value: '漢',
		fullWidth: true,
		styles: [],
	});

	t.is(asciiWidth, 1);
	t.is(cjkWidth, 2);
	t.false(caches.widths.has('A'));
	t.false(caches.widths.has('漢'));
});

test('getCharacterWidth falls back to string-width for non-ASCII narrow chars', t => {
	const caches = new OutputCaches();

	const width = caches.getCharacterWidth({
		type: 'char',
		value: 'é',
		fullWidth: false,
		styles: [],
	});

	t.is(width, 1);
	t.true(caches.widths.has('é'));
});

test('plain ASCII lines reuse StyledChar instances', t => {
	const caches = new OutputCaches();

	const single = caches.getStyledChars('a');
	const repeated = caches.getStyledChars('aa');

	t.is(single[0], repeated[0]);
});

test('ANSI-marked lines preserve styles', t => {
	const caches = new OutputCaches();
	const styledChars = caches.getStyledChars('\u001B[31mA\u001B[39m');

	t.is(styledChars.length, 1);
	t.true(styledChars[0]!.styles.length > 0);
});

test('ANSI style runs reuse style array references', t => {
	const caches = new OutputCaches();
	const styledChars = caches.getStyledChars('\u001B[31mAB\u001B[39m');

	t.is(styledChars.length, 2);
	t.is(styledChars[0]!.styles, styledChars[1]!.styles);
});

test('styled rendering preserves ANSI transitions', t => {
	const output = new Output({
		width: 4,
		height: 1,
	});

	output.write(0, 0, '\u001B[31mA\u001B[32mB\u001B[39m', {transformers: []});
	t.is(output.get().output, '\u001B[31mA\u001B[32mB\u001B[39m');
});

test('plain non-ASCII lines include full-width metadata', t => {
	const caches = new OutputCaches();
	const styledChars = caches.getStyledChars('漢');

	t.is(styledChars.length, 1);
	t.true(styledChars[0]!.fullWidth);
});

test('OutputCaches prunes width cache when maxEntries is exceeded', t => {
	const caches = new OutputCaches({maxEntries: 2});

	caches.getStringWidth('a');
	caches.getStringWidth('b');
	caches.getStringWidth('c');

	t.true(caches.widths.size <= 2);
	t.true(caches.widths.has('c'));
});

test('OutputCaches prunes styledChars cache when maxEntries is exceeded', t => {
	const caches = new OutputCaches({maxEntries: 2});

	caches.getStyledChars('a');
	caches.getStyledChars('b');
	caches.getStyledChars('c');

	t.true(caches.styledChars.size <= 2);
	t.true(caches.styledChars.has('c'));
});

test('getLines caches split line arrays', t => {
	const caches = new OutputCaches();

	const first = caches.getLines('a\nb');
	const second = caches.getLines('a\nb');

	t.is(first, second);
	t.deepEqual(second, ['a', 'b']);
});

test('OutputCaches prunes lines cache when maxEntries is exceeded', t => {
	const caches = new OutputCaches({maxEntries: 2});

	caches.getLines('a');
	caches.getLines('b');
	caches.getLines('c');

	t.true(caches.lines.size <= 2);
	t.true(caches.lines.has('c'));
});

test('OutputCaches pruneToFactor controls eviction target', t => {
	const caches = new OutputCaches({
		maxEntries: 10,
		pruneToFactor: 0.5,
	});

	for (let index = 0; index < 11; index++) {
		caches.getStringWidth(String(index));
	}

	t.true(caches.widths.size <= 6);
});

test('line memoization keeps unchanged rows and updates changed rows', t => {
	const output = new Output({
		width: 2,
		height: 2,
	});

	output.write(0, 0, 'ab\ncd', {transformers: []});
	t.is(output.get().output, 'ab\ncd');

	output.reset(2, 2);
	output.write(0, 0, 'ab\nef', {transformers: []});
	t.is(output.get().output, 'ab\nef');
});

test('line memoization does not keep stale rows when content is cleared', t => {
	const output = new Output({
		width: 2,
		height: 2,
	});

	output.write(0, 1, 'zz', {transformers: []});
	t.is(output.get().output, '\nzz');

	output.reset(2, 2);
	t.is(output.get().output, '\n');
});

test('clip applies horizontal and vertical bounds to writes', t => {
	const output = new Output({
		width: 6,
		height: 2,
	});

	output.clip({x1: 1, x2: 5, y1: 0, y2: 2});
	output.write(0, 0, 'ABCDE\nFGHIJ', {transformers: []});
	output.unclip();

	t.is(output.get().output, ' BCDE\n GHIJ');
});

test('clip can apply vertical-only bounds', t => {
	const output = new Output({
		width: 8,
		height: 2,
	});

	output.clip({x1: undefined, x2: undefined, y1: 1, y2: 2});
	output.write(0, 0, 'top\nbottom', {transformers: []});
	output.unclip();

	t.is(output.get().output, '\nbottom');
});

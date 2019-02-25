import '.';
export const x = 1;
declare var foo: {bar?: {baz?: {x: 1}; call?(): {fn?(): {x: 1}}}};
declare var bar: {baz?: {x: 1}};
declare var a: {foo?(): {bar: 1}; baz?: {x: 1}[]};

function assert(a: string, b: string) {
    if (a !== b) throw new Error(`Not equal: \n-------\n${a}\n-------\n${b}\n-------`);
}

const test1 = () => foo.bar!.baz!.x.orUndefined();
const test2 = () => foo.bar!.baz!.orUndefined();
const test3 = () => bar.orUndefined();
const test4 = () => bar!.baz!.orUndefined();
const test5 = () => bar!.baz!.orUndefined();
const test6 = () => bar.orUndefined();
const test7 = () => a.foo!().bar.orUndefined();
const test8 = () => a.baz![0].x.orUndefined();
// const test7 = () => n(foo.bar!.call!().fn!().x);
assert(
    test1.toString(),
    '() => /*foo.bar!.baz!.x*/ (_b = (_a = foo === u ? u : foo.bar) === u ? u : _a.baz) === u ? u : _b.x',
);
assert(test2.toString(), '() => /*foo.bar!.baz!*/ (_c = foo === u ? u : foo.bar) === u ? u : _c.baz');
assert(test3.toString(), '() => bar');
assert(test4.toString(), '() => /*bar!.baz!*/ bar === u ? u : bar.baz');
assert(test5.toString(), '() => /*bar!.baz!*/ bar === u ? u : bar.baz');
assert(test6.toString(), '() => bar');
assert(
    test7.toString(),
    '() => /*a.foo!().bar*/ (_e = (_d = a === u ? u : a.foo) === u ? u : _d()) === u ? u : _e.bar',
);
assert(
    test8.toString(),
    '() => /*a.baz![0].x*/ (_g = (_f = a === u ? u : a.baz) === u ? u : _f[0]) === u ? u : _g.x',
);

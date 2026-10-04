// node --test scripts/tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickColumn, pickDirection, pickOrder, parsePagination, clampInt, inClause, assertSafeIdentifier } from '../../lib/security/sqlWhitelist.js';

const SORT = { created: 'u.created_at', name: 'u.username' };

test('pickColumn: yalnızca beyaz listedeki anahtarlar; enjeksiyon denemeleri fallback', () => {
    assert.equal(pickColumn('name', SORT, 'created'), 'u.username');
    assert.equal(pickColumn('name; DROP TABLE users', SORT, 'created'), 'u.created_at');
    assert.equal(pickColumn('constructor', SORT, 'created'), 'u.created_at');   // prototype anahtarı
    assert.equal(pickColumn('__proto__', SORT, 'created'), 'u.created_at');
    assert.equal(pickColumn(undefined, SORT, 'created'), 'u.created_at');
    assert.throws(() => pickColumn('x', SORT, 'yok'));
});

test('pickDirection / pickOrder', () => {
    assert.equal(pickDirection('asc'), 'ASC');
    assert.equal(pickDirection('DESC; --'), 'DESC');
    assert.equal(pickDirection(null, 'ASC'), 'ASC');
    assert.deepEqual(pickOrder('name', 'asc', SORT, 'created'), { column: 'u.username', direction: 'ASC' });
});

test('parsePagination: NaN/negatif/devasa değerler sınırlanır', () => {
    const p = (q, o) => parsePagination(new URLSearchParams(q), o);
    assert.deepEqual(p('', { defaultLimit: 20, maxLimit: 100 }), { page: 1, limit: 20, offset: 0 });
    assert.deepEqual(p('page=3&limit=10'), { page: 3, limit: 10, offset: 20 });
    assert.equal(p('limit=999999999').limit, 100);
    assert.equal(p('limit=-5').limit, 1);
    assert.equal(p('page=-2').page, 1);
    assert.equal(p('page=abc&limit=xyz').page, 1);
    assert.equal(p('page=99999999999').page, 100000);
});

test('clampInt', () => {
    assert.equal(clampInt('500', 1, 90, 7), 90);
    assert.equal(clampInt('-3', 1, 90, 7), 1);
    assert.equal(clampInt('x', 1, 90, 7), 7);
});

test('inClause: yalnızca pozitif tamsayılar, uzunluk sınırlı', () => {
    assert.deepEqual(inClause([1, '2', 3.5, -1, 0, 'x', null, "1; DROP"]), { placeholders: '?,?', args: [1, 2] });
    assert.deepEqual(inClause('1,2'), { placeholders: '', args: [] });
    assert.equal(inClause(Array.from({ length: 900 }, (_, i) => i + 1)).args.length, 500);
});

test('assertSafeIdentifier', () => {
    assert.equal(assertSafeIdentifier('user_ratings'), 'user_ratings');
    for (const bad of ['a b', 'x);DROP', '1abc', '', null, 'a-b', 'a'.repeat(65)]) assert.throws(() => assertSafeIdentifier(bad));
});

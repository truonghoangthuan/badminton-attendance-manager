import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../app/locales/en.ts';
import { vi } from '../app/locales/vi.ts';

function getNestedKey(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function formatString(template, params = {}) {
  if (!template || typeof template !== 'string') return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => (params[key] !== undefined ? String(params[key]) : `{${key}}`));
}

test('i18n key parity between en and vi', () => {
  function getAllKeys(obj, prefix = '') {
    return Object.keys(obj).reduce((res, el) => {
      if (Array.isArray(obj[el])) {
        return res;
      } else if (typeof obj[el] === 'object' && obj[el] !== null) {
        return [...res, ...getAllKeys(obj[el], prefix + el + '.')];
      }
      return [...res, prefix + el];
    }, []);
  }

  const enKeys = getAllKeys(en).sort();
  const viKeys = getAllKeys(vi).sort();

  const missingInVi = enKeys.filter(k => !viKeys.includes(k));
  const missingInEn = viKeys.filter(k => !enKeys.includes(k));

  assert.deepEqual(missingInVi, [], `Missing in VI: ${missingInVi.join(', ')}`);
  assert.deepEqual(missingInEn, [], `Missing in EN: ${missingInEn.join(', ')}`);
});

test('formatString interpolates parameters correctly', () => {
  const tpl = 'Match with {count} players on {court}';
  const res = formatString(tpl, { count: 8, court: 'Court 4' });
  assert.equal(res, 'Match with 8 players on Court 4');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  removeVietnameseDiacritics,
  resolveBankCode,
  generateVietQRUrl,
} from '../app/utils/vietqr.ts';

test('removeVietnameseDiacritics strips accents and đ/Đ', () => {
  assert.equal(removeVietnameseDiacritics('Nguyễn Văn Đạt'), 'Nguyen Van Dat');
});

test('resolveBankCode matches BIN, code, and alias', () => {
  assert.equal(resolveBankCode('970422'), 'MB');
  assert.equal(resolveBankCode('vcb'), 'VCB');
  assert.equal(resolveBankCode('Techcombank'), 'TCB');
});

test('generateVietQRUrl encodes amount and accountName without addInfo', () => {
  const url = generateVietQRUrl({
    bankId: 'MB',
    accountNumber: '0123 456 789',
    accountName: 'Nguyễn Văn A',
    amount: 55000,
    template: 'qr_only',
  });
  assert.equal(
    url,
    'https://img.vietqr.io/image/MB-0123456789-qr_only.jpg?amount=55000&accountName=Nguyen%20Van%20A'
  );
  assert.equal(url.includes('addInfo'), false);
});

test('generateVietQRUrl returns clean base URL when amount and accountName are omitted', () => {
  const url = generateVietQRUrl({
    bankId: 'VCB',
    accountNumber: '9988776655',
    amount: 0,
    template: 'compact2',
  });
  assert.equal(url, 'https://img.vietqr.io/image/VCB-9988776655-compact2.jpg');
});

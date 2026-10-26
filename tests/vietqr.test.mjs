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

test('generateVietQRUrl encodes amount, accountName, and memo as addInfo', () => {
  const url = generateVietQRUrl({
    bankId: 'MB',
    accountNumber: '0123 456 789',
    accountName: 'Nguyễn Văn A',
    amount: 55000,
    memo: 'BDM 20261026 Nguyễn Văn A #1',
    template: 'qr_only',
  });
  assert.equal(
    url,
    'https://img.vietqr.io/image/MB-0123456789-qr_only.jpg?amount=55000&accountName=Nguyen%20Van%20A&addInfo=BDM%2020261026%20Nguyen%20Van%20A%201'
  );
});

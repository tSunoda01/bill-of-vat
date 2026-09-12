import { numberToWordsLKR, formatGazetteDate, generateGazetteInvoiceNo } from '../lib/gazetteUtils';

test('numberToWordsLKR formats simple amount', () => {
  expect(numberToWordsLKR(1234.56)).toBe('One Thousand Two Hundred Thirty-Four Rupees and Fifty-Six Cents Only');
});

test('formatGazetteDate returns MM/DD/YYYY', () => {
  expect(formatGazetteDate('2024-02-05')).toBe('02/05/2024');
});

test('generateGazetteInvoiceNo produces correct pattern', () => {
  const no = generateGazetteInvoiceNo('2024-09-12', 'BR01', 7);
  expect(no).toMatch(/^24SEP_BR01_00007$/);
});

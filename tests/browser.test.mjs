import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function collectDownloads(page, count, trigger) {
  const downloads = [];
  let onDownload;
  const downloadsReady = new Promise((resolve) => {
    onDownload = (download) => {
      downloads.push(download);
      if (downloads.length === count) resolve(downloads);
    };
    page.on('download', onDownload);
  });

  try {
    await trigger();
    return await downloadsReady;
  } finally {
    page.off('download', onDownload);
  }
}

test('比較、TXT保存、外部通信なし、Offline動作、Console Errorなし', async ({ page, context }) => {
  const consoleErrors = [];
  const externalRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', (request) => { if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url()); });
  await page.goto('/text/list-compare/');
  await page.getByLabel('リストA').fill(' A001 \nA002\nA002\n😀');
  await page.getByLabel('リストB').fill('A002\nA003\n😀');
  await page.getByRole('button', { name: '比較する' }).click();
  await expect(page.locator('#list-aOnly')).toHaveValue(' A001 ');
  await expect(page.locator('#list-both')).toHaveValue('A002\n😀');
  await expect(page.locator('#list-bOnly')).toHaveValue('A003');
  await expect(page.locator('#stats-a')).toContainText('重複件数1');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'TXT保存' }).first().click();
  await expect((await download).suggestedFilename()).toBe('a-only.txt');
  await context.setOffline(true);
  await page.getByLabel('リストA').fill('オフライン');
  await page.getByLabel('リストB').fill('オフライン\n継続');
  await page.getByRole('button', { name: '比較する' }).click();
  await expect(page.locator('#list-both')).toHaveValue('オフライン');
  await expect(page.locator('#list-bOnly')).toHaveValue('継続');
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('空入力の案内と主要な静的ページを表示できる', async ({ page }) => {
  await page.goto('/text/list-compare/');
  await page.getByRole('button', { name: '比較する' }).click();
  await expect(page.locator('#notice')).toHaveText('比較するデータを入力してください。');
  for (const [path, heading] of [['/', '仕事のデータを、外に出さずに処理。'], ['/privacy/', 'プライバシー'], ['/terms/', '利用規約']]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  }
});

test('スマートフォン幅でも主要操作部が横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/text/list-compare/');
  await expect(page.getByRole('button', { name: '比較する' })).toBeVisible();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('CSV列抽出はファイル選択、Preview、Download、Offlineで動作する', async ({ page, context }) => {
  const consoleErrors = [];
  const externalRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', (request) => { if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url()); });
  await page.goto('/csv/columns/');
  await page.setInputFiles('#csv-file', { name: 'customers.csv', mimeType: 'text/csv', buffer: Buffer.from('\uFEFFID,NAME,NOTE\r\n001,田中,"東京,営業"\r\n002,鈴木,開発', 'utf8') });
  await expect(page.getByText('customers.csv')).toBeVisible();
  await expect(page.locator('input[name="csv-column"]')).toHaveCount(3);
  await expect(page.locator('input[name="csv-column"]:checked')).toHaveCount(3);
  await page.locator('input[name="csv-column"]').nth(2).uncheck();
  await page.getByRole('button', { name: '選択した列でCSVを作成' }).click();
  await expect(page.locator('#csv-preview')).toContainText('ID');
  await expect(page.locator('#csv-preview')).toContainText('田中');
  await expect(page.locator('#csv-preview')).not.toContainText('東京,営業');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSVを保存' }).click();
  await expect((await download).suggestedFilename()).toBe('customers-columns.csv');
  await context.setOffline(true);
  await page.setInputFiles('#csv-file', { name: 'offline.csv', mimeType: 'text/csv', buffer: Buffer.from('A,B\n1,2', 'utf8') });
  await page.getByRole('button', { name: '選択した列でCSVを作成' }).click();
  await expect(page.locator('#csv-preview')).toContainText('1');
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('CSV列抽出はスマートフォン幅でも横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/csv/columns/');
  await expect(page.getByLabel('CSVファイル')).toBeVisible();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('CSV重複チェックは複数キー、Download、Offline、外部通信なしで動作する', async ({ page, context }) => {
  const consoleErrors = [];
  const externalRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', (request) => { if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url()); });
  await page.goto('/csv/duplicate-check/');
  await page.setInputFiles('#duplicate-file', { name: 'customers.csv', mimeType: 'text/csv', buffer: Buffer.from('\uFEFFID,NAME\r\n001,田中\r\n001,田中\r\n001,鈴木\r\n002,田中', 'utf8') });
  await expect(page.locator('input[name="duplicate-key"]')).toHaveCount(2);
  await page.locator('input[name="duplicate-key"]').nth(0).check();
  await page.locator('input[name="duplicate-key"]').nth(1).check();
  await page.getByRole('button', { name: '重複をチェック' }).click();
  await expect(page.locator('#result-group-count')).toHaveText('1');
  await expect(page.locator('#result-row-count')).toHaveText('2');
  await expect(page.locator('#duplicate-groups')).toContainText('最初の出現');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '重複行をCSV保存' }).click();
  await expect((await download).suggestedFilename()).toBe('customers-duplicates.csv');
  await context.setOffline(true);
  await page.setInputFiles('#duplicate-file', { name: 'offline.csv', mimeType: 'text/csv', buffer: Buffer.from('ID\nA\nA', 'utf8') });
  await expect(page.locator('input[name="duplicate-key"]')).toHaveCount(1);
  await page.locator('input[name="duplicate-key"]').first().check();
  await page.getByRole('button', { name: '重複をチェック' }).click();
  await expect(page.locator('#result-row-count')).toHaveText('2');
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('CSV重複チェックはスマートフォン幅でも横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/csv/duplicate-check/');
  await expect(page.getByLabel('CSVファイル')).toBeVisible();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('CSV重複行削除は最初の行を残し、Download、Offline、外部通信なしで動作する', async ({ page, context }) => {
  const consoleErrors = [];
  const externalRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', (request) => { if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url()); });
  await page.goto('/csv/remove-duplicates/');
  await page.setInputFiles('#dedupe-file', {
    name: 'customers.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('\uFEFFID,NAME,NOTE\r\n001,田中,"東京,営業"\r\n001,田中,"東京,営業"\r\n001,田中,異動\r\n002,鈴木,開発', 'utf8')
  });
  await expect(page.locator('input[name="dedupe-key"]')).toHaveCount(3);
  await page.locator('input[name="dedupe-key"]').nth(0).check();
  await page.getByRole('button', { name: '重複行を削除' }).click();
  await expect(page.locator('#dedupe-source-row-count')).toHaveText('4');
  await expect(page.locator('#dedupe-group-count')).toHaveText('1');
  await expect(page.locator('#dedupe-removed-row-count')).toHaveText('2');
  await expect(page.locator('#dedupe-output-row-count')).toHaveText('2');
  await expect(page.locator('#dedupe-preview')).toContainText('東京,営業');
  await expect(page.locator('#dedupe-preview')).toContainText('鈴木');
  await expect(page.locator('#dedupe-preview')).not.toContainText('異動');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '重複削除後のCSVを保存' }).click();
  const downloaded = await download;
  expect(downloaded.suggestedFilename()).toBe('customers-duplicates-removed.csv');
  const downloadPath = await downloaded.path();
  expect(downloadPath).not.toBeNull();
  expect(await readFile(downloadPath ?? '', 'utf8')).toBe('\uFEFFID,NAME,NOTE\r\n001,田中,"東京,営業"\r\n002,鈴木,開発');

  await context.setOffline(true);
  await page.setInputFiles('#dedupe-file', {
    name: 'offline.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('ID,NAME\nA,オフライン\nA,重複\nB,残す', 'utf8')
  });
  await page.locator('input[name="dedupe-key"]').first().check();
  await page.getByRole('button', { name: '重複行を削除' }).click();
  await expect(page.locator('#dedupe-removed-row-count')).toHaveText('1');
  await expect(page.locator('#dedupe-preview')).toContainText('オフライン');
  await expect(page.locator('#dedupe-preview')).toContainText('残す');

  await page.setInputFiles('#dedupe-file', {
    name: 'unique.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('ID,NAME\nA,一\nB,二', 'utf8')
  });
  await page.locator('input[name="dedupe-key"]').first().check();
  await page.getByRole('button', { name: '重複行を削除' }).click();
  await expect(page.locator('#dedupe-notice')).toHaveText('重複行は見つかりませんでした。元の内容のまま保存できます。');
  await expect(page.locator('#dedupe-removed-row-count')).toHaveText('0');
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('CSV重複行削除はスマートフォン幅でも横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/csv/remove-duplicates/');
  await expect(page.getByLabel('CSVファイル')).toBeVisible();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('CSV空欄行削除は完全空欄だけを削除し、Download、Offline、外部通信なしで動作する', async ({ page, context }) => {
  const consoleErrors = [];
  const externalRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', (request) => { if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url()); });
  await page.goto('/csv/remove-empty-rows/');
  await page.setInputFiles('#remove-empty-file', { name: 'customers.csv', mimeType: 'text/csv', buffer: Buffer.from('\uFEFFID,NAME,NOTE\r\n001,田中,\r\n,,\r\n002,,開発\r\n,,', 'utf8') });
  await expect(page.locator('#removed-row-count')).toHaveText('2');
  await expect(page.locator('#remaining-row-count')).toHaveText('2');
  await expect(page.locator('#remove-empty-preview')).toContainText('田中');
  await expect(page.locator('#remove-empty-preview')).toContainText('開発');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSVを保存' }).click();
  await expect((await download).suggestedFilename()).toBe('customers-empty-rows-removed.csv');
  await context.setOffline(true);
  await page.setInputFiles('#remove-empty-file', { name: 'offline.csv', mimeType: 'text/csv', buffer: Buffer.from('ID,NOTE\n1, \n,,', 'utf8') });
  await expect(page.locator('#removed-row-count')).toHaveText('1');
  await expect(page.locator('#remove-empty-preview')).toContainText('1');
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('CSV空欄行削除はスマートフォン幅でも横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/csv/remove-empty-rows/');
  await expect(page.getByLabel('CSVファイル')).toBeVisible();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('CSV結合は複数ファイルを順番どおりに結合し、Download、Offline、外部通信なしで動作する', async ({ page, context }) => {
  const consoleErrors = [];
  const externalRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', (request) => { if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url()); });
  await page.goto('/csv/merge/');
  await page.setInputFiles('#merge-files', [
    { name: 'customers-part-1.csv', mimeType: 'text/csv', buffer: Buffer.from('\uFEFFID,NAME,NOTE\r\n001,田中,"東京,営業"\r\n002,鈴木,開発', 'utf8') },
    { name: 'customers-part-2.csv', mimeType: 'text/csv', buffer: Buffer.from('ID,NAME,NOTE\r\n003,佐藤,総務\r\n004,山田,"大阪,企画"', 'utf8') }
  ]);
  const preview = page.locator('#merge-preview');
  await expect(preview).toContainText('ID');
  await expect(preview).toContainText('田中');
  await expect(preview).toContainText('佐藤');
  const previewText = await preview.innerText();
  expect(previewText.indexOf('田中')).toBeLessThan(previewText.indexOf('佐藤'));
  expect((previewText.match(/\bID\b/g) || []).length).toBe(1);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSVを保存' }).click();
  await expect((await download).suggestedFilename()).toMatch(/\.csv$/i);
  await context.setOffline(true);
  await page.setInputFiles('#merge-files', [
    { name: 'offline-a.csv', mimeType: 'text/csv', buffer: Buffer.from('ID,NAME\nA,オフライン1', 'utf8') },
    { name: 'offline-b.csv', mimeType: 'text/csv', buffer: Buffer.from('ID,NAME\nB,オフライン2', 'utf8') }
  ]);
  await expect(preview).toContainText('オフライン1');
  await expect(preview).toContainText('オフライン2');
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('CSV結合はスマートフォン幅でも横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/csv/merge/');
  await expect(page.getByLabel('CSVファイル')).toBeVisible();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('CSV分割は複数パートのPreview、Download、Offline、外部通信なし、Console Errorなしで動作する', async ({ page, context }) => {
  const consoleErrors = [];
  const externalRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', (request) => { if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url()); });
  await page.goto('/csv/split/');
  await page.setInputFiles('#split-file', {
    name: 'customers.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from([
      '\uFEFFID,NAME,NOTE',
      '001,田中,"東京,営業"',
      '002,鈴木,開発',
      '003,佐藤,"大阪,企画"',
      '004,山田,"引用符 ""付き"""',
      '005,高橋,総務'
    ].join('\r\n'), 'utf8')
  });
  await page.getByLabel('1ファイルあたりのデータ行数').fill('2');
  await page.getByRole('button', { name: 'CSVを分割' }).click();

  await expect(page.locator('#split-summary')).toBeVisible();
  await expect(page.locator('#split-part-count')).toHaveText('3');
  const parts = page.locator('#split-preview .split-part');
  await expect(parts).toHaveCount(3);
  await expect(parts.nth(0)).toContainText('001');
  await expect(parts.nth(0)).toContainText('田中');
  await expect(parts.nth(0)).toContainText('東京,営業');
  await expect(parts.nth(1)).toContainText('003');
  await expect(parts.nth(1)).toContainText('佐藤');
  await expect(parts.nth(1)).toContainText('大阪,企画');
  await expect(parts.nth(2)).toContainText('005');

  const downloads = await collectDownloads(page, 3, () => page.getByRole('button', { name: '分割したCSVをすべて保存' }).click());
  expect(downloads.map((download) => download.suggestedFilename())).toEqual([
    'customers-part-1.csv',
    'customers-part-2.csv',
    'customers-part-3.csv'
  ]);

  await context.setOffline(true);
  await page.getByLabel('1ファイルあたりのデータ行数').fill('1');
  await page.setInputFiles('#split-file', {
    name: 'offline.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('ID,NAME,NOTE\n0007,オフライン,"再実行,確認"\n0008,動作,完了', 'utf8')
  });
  await page.getByRole('button', { name: 'CSVを分割' }).click();
  await expect(page.locator('#split-part-count')).toHaveText('2');
  await expect(page.locator('#split-preview .split-part')).toHaveCount(2);
  await expect(page.locator('#split-preview')).toContainText('0007');
  await expect(page.locator('#split-preview')).toContainText('再実行,確認');
  await expect(page.locator('#split-preview')).toContainText('0008');
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('CSV分割はスマートフォン幅でも横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/csv/split/');
  await expect(page.getByLabel('CSVファイル')).toBeVisible();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('CSVヘッダー比較はAのみ・共通・Bのみ・列順差異を表示し、Offlineで再比較できる', async ({ page, context }) => {
  const consoleErrors = [];
  const externalRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => { consoleErrors.push(error.message); });
  page.on('request', (request) => { if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url()); });

  await page.goto('/csv/header-compare/');
  await page.setInputFiles('#header-a-file', {
    name: 'sales-a.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('\uFEFFID,NAME,A_ONLY\r\n001,田中,A側のデータ', 'utf8')
  });
  await page.setInputFiles('#header-b-file', {
    name: 'sales-b.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('NAME,ID,B_ONLY\r\n鈴木,B側のデータ,B', 'utf8')
  });
  await expect(page.locator('#header-a-summary')).toBeVisible();
  await expect(page.locator('#header-b-summary')).toBeVisible();
  await expect(page.locator('#header-a-file-name')).toHaveText('sales-a.csv');
  await expect(page.locator('#header-a-column-count')).toHaveText('3');
  await expect(page.locator('#header-a-data-row-count')).toHaveText('1');
  await expect(page.locator('#header-b-file-size')).toContainText('bytes');

  await page.getByRole('button', { name: 'ヘッダーを比較' }).click();
  await expect(page.locator('#header-result')).toBeVisible();
  await expect(page.locator('#result-exact-match')).toHaveText('いいえ');
  await expect(page.locator('#result-column-count-a')).toHaveText('3');
  await expect(page.locator('#result-column-count-b')).toHaveText('3');
  await expect(page.locator('#result-only-a-count')).toHaveText('1');
  await expect(page.locator('#result-only-b-count')).toHaveText('1');
  await expect(page.locator('#result-common-count')).toHaveText('2');
  await expect(page.locator('#result-order')).toHaveText('異なる');
  await expect(page.locator('#only-a-columns')).toContainText('A_ONLY');
  await expect(page.locator('#common-columns')).toContainText('ID');
  await expect(page.locator('#common-columns')).toContainText('NAME');
  await expect(page.locator('#only-b-columns')).toContainText('B_ONLY');
  await expect(page.locator('#header-order-differences')).toContainText('1列目');
  await expect(page.locator('#header-result')).not.toContainText('A側のデータ');
  await expect(page.locator('#header-result')).not.toContainText('B側のデータ');

  await context.setOffline(true);
  await page.setInputFiles('#header-a-file', {
    name: 'offline-a.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('OFFLINE,共通\n再比較,A', 'utf8')
  });
  await page.setInputFiles('#header-b-file', {
    name: 'offline-b.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('OFFLINE,共通\n再比較,B', 'utf8')
  });
  await page.getByRole('button', { name: 'ヘッダーを比較' }).click();
  await expect(page.locator('#result-exact-match')).toHaveText('はい');
  await expect(page.locator('#result-only-a-count')).toHaveText('0');
  await expect(page.locator('#result-only-b-count')).toHaveText('0');
  await expect(page.locator('#result-common-count')).toHaveText('2');
  await expect(page.locator('#result-order')).toHaveText('同じ');
  await expect(page.locator('#only-a-columns')).toHaveText('なし');
  await expect(page.locator('#only-b-columns')).toHaveText('なし');
  await expect(page.locator('#header-order-differences')).toHaveText('なし');
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('CSVヘッダー比較は390x844でも入力と比較ボタンを操作でき、横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/csv/header-compare/');
  await expect(page.locator('#header-a-file')).toBeVisible();
  await expect(page.locator('#header-b-file')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ヘッダーを比較' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ヘッダーを比較' })).toBeEnabled();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('CSV並べ替えは昇順・降順、Preview、Download、Offline、外部通信なしで動作する', async ({ page, context }) => {
  const consoleErrors = [];
  const externalRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => { consoleErrors.push(error.message); });
  page.on('request', (request) => { if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url()); });

  await page.goto('/csv/sort/');
  await page.setInputFiles('#sort-file', {
    name: 'customers.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('\uFEFFID,NAME,NOTE\r\n003,鈴木,"東京,営業"\r\n001,佐藤,"引用符 ""付き"""\r\n002,田中,"複数\n行"\r\n001,加藤,同じキー', 'utf8')
  });
  await expect(page.locator('#sort-summary')).toBeVisible();
  await expect(page.locator('#sort-file-name')).toHaveText('customers.csv');
  await expect(page.locator('#sort-column-count')).toHaveText('3');
  await expect(page.locator('#sort-data-row-count')).toHaveText('4');

  await page.locator('#sort-column').selectOption('0');
  await page.getByRole('radio', { name: '昇順' }).check();
  await page.getByRole('button', { name: '並べ替える' }).click();
  await expect(page.locator('#sort-result')).toBeVisible();
  await expect(page.locator('#sort-result-column')).toHaveText('ID');
  await expect(page.locator('#sort-result-direction')).toHaveText('昇順');
  await expect(page.locator('#sort-result-row-count')).toHaveText('4行');
  const rows = page.locator('#sort-preview tbody tr');
  await expect(rows).toHaveCount(4);
  expect(await rows.evaluateAll((items) => items.map((item) => [item.cells[0].textContent, item.cells[1].textContent]))).toEqual([
    ['001', '佐藤'],
    ['001', '加藤'],
    ['002', '田中'],
    ['003', '鈴木']
  ]);
  await expect(page.locator('#sort-preview')).toContainText('東京,営業');
  await expect(page.locator('#sort-preview')).toContainText('引用符 "付き"');
  await expect(page.locator('#sort-preview')).toContainText('複数\n行');

  const ascDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSVを保存' }).click();
  await expect((await ascDownload).suggestedFilename()).toBe('customers-sorted.csv');

  await page.getByRole('radio', { name: '降順' }).check();
  await page.getByRole('button', { name: '並べ替える' }).click();
  await expect(page.locator('#sort-result-direction')).toHaveText('降順');
  await expect(rows).toHaveCount(4);
  expect(await rows.evaluateAll((items) => items.map((item) => [item.cells[0].textContent, item.cells[1].textContent]))).toEqual([
    ['003', '鈴木'],
    ['002', '田中'],
    ['001', '佐藤'],
    ['001', '加藤']
  ]);

  await context.setOffline(true);
  await page.setInputFiles('#sort-file', {
    name: 'offline.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('NAME,ID\nオフライン2,2\nオフライン1,1', 'utf8')
  });
  await expect(page.locator('#sort-file-name')).toHaveText('offline.csv');
  await page.locator('#sort-column').selectOption('1');
  await page.getByRole('radio', { name: '昇順' }).check();
  await page.getByRole('button', { name: '並べ替える' }).click();
  await expect(page.locator('#sort-preview')).toContainText('オフライン1');
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('CSV並べ替えは390x844でも主要操作が可能で横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/csv/sort/');
  await page.setInputFiles('#sort-file', {
    name: 'mobile.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('ID,NAME\n2,田中\n1,佐藤', 'utf8')
  });
  await expect(page.locator('#sort-column')).toBeVisible();
  await expect(page.getByRole('radio', { name: '昇順' })).toBeVisible();
  await expect(page.getByRole('radio', { name: '降順' })).toBeVisible();
  await page.locator('#sort-column').selectOption('0');
  await page.getByRole('radio', { name: '昇順' }).check();
  await expect(page.getByRole('button', { name: '並べ替える' })).toBeEnabled();
  await page.getByRole('button', { name: '並べ替える' }).click();
  await expect(page.getByRole('button', { name: 'CSVを保存' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSVを保存' }).click();
  await expect((await download).suggestedFilename()).toBe('mobile-sorted.csv');
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('CSV空欄セルチェックは集計、位置表示、空欄0件、Offline、外部通信なしで動作する', async ({ page, context }) => {
  const consoleErrors = [];
  const externalRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => { consoleErrors.push(error.message); });
  page.on('request', (request) => { if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url()); });

  await page.goto('/csv/empty-cell-check/');
  await page.setInputFiles('#empty-cell-file', {
    name: 'customers.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from([
      '\uFEFFID,NAME,EMAIL,NOTE',
      '001,田中,tanaka@example.com,0',
      '002,鈴木,"",N/A',
      '003,,sato@example.com,　',
      '004,,,"東京,営業"',
      '005,山田,"引用符 ""付き""","複数\n行"'
    ].join('\r\n'), 'utf8')
  });

  await expect(page.locator('#empty-cell-summary')).toBeVisible();
  await expect(page.locator('#empty-cell-file-name')).toHaveText('customers.csv');
  await expect(page.locator('#empty-cell-column-count')).toHaveText('4');
  await expect(page.locator('#empty-cell-data-row-count')).toHaveText('5');
  await expect(page.getByRole('button', { name: '空欄セルをチェック' })).toBeEnabled();

  await page.getByRole('button', { name: '空欄セルをチェック' }).click();
  await expect(page.locator('#empty-cell-result')).toBeVisible();
  await expect(page.locator('#empty-cell-result-empty-count')).toHaveText('4');
  await expect(page.locator('#empty-cell-result-row-count')).toHaveText('3');
  await expect(page.locator('#empty-cell-result-data-row-count')).toHaveText('5');
  await expect(page.locator('#empty-cell-result-column-count')).toHaveText('4');
  await expect(page.locator('#empty-cell-column-table tbody tr')).toHaveCount(4);
  await expect(page.locator('#empty-cell-column-table')).toContainText('NAME');
  await expect(page.locator('#empty-cell-column-table')).toContainText('EMAIL');
  await expect(page.locator('#empty-cell-position-list tbody tr')).toHaveCount(4);
  await expect(page.locator('#empty-cell-position-list')).toContainText('3行目');
  await expect(page.locator('#empty-cell-position-list')).toContainText('4行目');
  await expect(page.locator('#empty-cell-position-list')).toContainText('5行目');
  await expect(page.locator('#empty-cell-position-list')).toContainText('2列目');
  await expect(page.locator('#empty-cell-position-list')).toContainText('3列目');
  await expect(page.locator('#empty-cell-notice')).toHaveText('4件の空欄セルを検出しました。');

  await context.setOffline(true);
  await page.setInputFiles('#empty-cell-file', {
    name: 'offline.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('ID,NAME\n001,オフライン\n002,確認', 'utf8')
  });
  await expect(page.locator('#empty-cell-file-name')).toHaveText('offline.csv');
  await page.getByRole('button', { name: '空欄セルをチェック' }).click();
  await expect(page.locator('#empty-cell-result-empty-count')).toHaveText('0');
  await expect(page.locator('#empty-cell-result-row-count')).toHaveText('0');
  await expect(page.locator('#empty-cell-result-note')).toHaveText('空欄セルは見つかりませんでした。');
  await expect(page.locator('#empty-cell-position-list tbody tr')).toHaveCount(0);
  await expect(page.locator('#empty-cell-notice')).toHaveText('空欄セルは見つかりませんでした。');
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('CSV空欄セルチェックは空欄位置を先頭100件に制限する', async ({ page }) => {
  await page.goto('/csv/empty-cell-check/');
  await page.setInputFiles('#empty-cell-file', {
    name: 'many-empty.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from([
      'ID,NAME',
      ...Array.from({ length: 150 }, () => ',')
    ].join('\r\n'), 'utf8')
  });

  await expect(page.getByRole('button', { name: '空欄セルをチェック' })).toBeEnabled();
  await page.getByRole('button', { name: '空欄セルをチェック' }).click();
  await expect(page.locator('#empty-cell-result-empty-count')).toHaveText('300');
  await expect(page.locator('#empty-cell-position-list tbody tr')).toHaveCount(100);
  await expect(page.locator('#empty-cell-result-note')).toHaveText('空欄セルは300件です。先頭100件を表示しています。');
  await expect(page.locator('#empty-cell-position-note')).toHaveText('空欄位置は先頭100件に制限して表示しています。');
});

test('CSV空欄セルチェックは390x844でも主要操作が可能で横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/csv/empty-cell-check/');
  await page.setInputFiles('#empty-cell-file', {
    name: 'mobile.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('ID,NAME\n001,\n002,佐藤', 'utf8')
  });
  await expect(page.getByRole('button', { name: '空欄セルをチェック' })).toBeVisible();
  await expect(page.getByRole('button', { name: '空欄セルをチェック' })).toBeEnabled();
  await page.getByRole('button', { name: '空欄セルをチェック' }).click();
  await expect(page.locator('#empty-cell-result-empty-count')).toHaveText('1');
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

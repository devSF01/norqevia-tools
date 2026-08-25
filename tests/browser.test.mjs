import { test, expect } from '@playwright/test';

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

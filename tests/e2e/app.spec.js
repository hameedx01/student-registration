import { test, expect } from '@playwright/test';
import { decodeFunctionData, encodeErrorResult, encodeFunctionResult } from 'viem';
import { multicall2Abi } from '../../src/abi/multicall2Abi.js';
import { studentRegistrationAbi } from '../../src/abi/studentRegistrationAbi.js';
import { MULTICALL2_ADDRESS, STUDENT_REGISTRATION_ADDRESS } from '../../src/config/contracts.js';

const ADA = '0x1111111111111111111111111111111111111111';
const BOLA = '0x2222222222222222222222222222222222222222';
const NEW = '0x3333333333333333333333333333333333333333';
const HASH = `0x${'ab'.repeat(32)}`;
const BLOCK_HASH = `0x${'cd'.repeat(32)}`;
const errorAbi = [{ name: 'Error', type: 'error', inputs: [{ name: 'message', type: 'string' }] }];
const revert = (message) =>
  encodeErrorResult({ abi: errorAbi, errorName: 'Error', args: [message] });
const studentResult = (record) =>
  encodeFunctionResult({
    abi: studentRegistrationAbi,
    functionName: 'getStudent',
    result: [record.name, BigInt(record.age), record.course],
  });

async function setup(page, options = {}) {
  const records = new Map([
    [ADA, { name: 'Ada Okafor', age: '21', course: 'Computer Science' }],
    [BOLA, { name: 'Bola Adeyemi', age: '24', course: 'Mathematics' }],
  ]);
  const state = { transactions: [], multicalls: 0, pending: null };
  await page.addInitScript(
    ({ initialAddress, wrongChain, reject }) => {
      let accounts = [];
      let chainId = wrongChain ? '0x1' : '0xaa36a7';
      let selectedAddress = initialAddress;
      const listeners = {};
      const emit = (name, value) => (listeners[name] || []).forEach((callback) => callback(value));
      window.ethereum = {
        isMetaMask: true,
        on(name, callback) {
          (listeners[name] ||= []).push(callback);
        },
        removeListener(name, callback) {
          listeners[name] = (listeners[name] || []).filter((fn) => fn !== callback);
        },
        async request({ method, params }) {
          if (method === 'eth_chainId') return chainId;
          if (method === 'eth_accounts') return accounts;
          if (method === 'eth_requestAccounts' || method === 'wallet_requestPermissions') {
            accounts = [selectedAddress];
            emit('accountsChanged', accounts);
            return method === 'eth_requestAccounts'
              ? accounts
              : [{ parentCapability: 'eth_accounts' }];
          }
          if (method === 'wallet_switchEthereumChain') {
            chainId = params[0].chainId;
            emit('chainChanged', chainId);
            return null;
          }
          if (method === 'wallet_revokePermissions') {
            accounts = [];
            emit('accountsChanged', []);
            return null;
          }
          if (method === 'eth_sendTransaction' && reject)
            throw Object.assign(new Error('User rejected the request.'), { code: 4001 });
          if (method === 'wallet_getCapabilities') return {};
          if (method === 'wallet_sendTransaction')
            throw Object.assign(new Error('Unsupported method'), { code: 4200 });
          const response = await fetch('/test-rpc', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
          });
          const body = await response.json();
          if (body.error) throw Object.assign(new Error(body.error.message), body.error);
          return body.result;
        },
      };
      window.__changeWallet = (address) => {
        selectedAddress = address;
        accounts = [address];
        emit('accountsChanged', accounts);
      };
      window.__changeChain = (id) => {
        chainId = id;
        emit('chainChanged', id);
      };
    },
    {
      initialAddress: options.address || NEW,
      wrongChain: options.wrongChain || false,
      reject: options.reject || false,
    },
  );

  await page.route('**/test-explorer/**', async (route) => {
    const internal = route.request().url().includes('internal-transactions');
    if (options.historyFailure || (options.internalFailure && internal))
      return route.fulfill({ status: 503, json: { error: 'Service unavailable' } });
    // Keep history fixed to simulate the explorer indexing a new registration late.
    const items = internal
      ? [
          {
            from: { hash: BOLA },
            to: { hash: STUDENT_REGISTRATION_ADDRESS },
            type: 'call',
            success: true,
            error: null,
          },
        ]
      : [
          {
            from: { hash: ADA },
            to: { hash: STUDENT_REGISTRATION_ADDRESS },
            status: 'ok',
            result: 'success',
            raw_input: '0x637a0832',
          },
        ];
    return route.fulfill({ json: { items, next_page_params: null } });
  });

  async function rpc(request) {
    const { method, params = [] } = request;
    const response = (result) => ({ jsonrpc: '2.0', id: request.id, result });
    const error = (message) => ({
      jsonrpc: '2.0',
      id: request.id,
      error: { code: 3, message: `execution reverted: ${message}`, data: revert(message) },
    });
    if (method === 'eth_chainId') return response('0xaa36a7');
    if (method === 'eth_blockNumber') return response('0x64');
    if (method === 'eth_getCode') return response('0x');
    if (method === 'eth_estimateGas') return response('0x493e0');
    if (method === 'eth_gasPrice' || method === 'eth_maxPriorityFeePerGas')
      return response('0x3b9aca00');
    if (method === 'eth_getTransactionCount') return response('0x1');
    if (method === 'eth_call') {
      const call = params[0];
      if (call.to.toLowerCase() === MULTICALL2_ADDRESS.toLowerCase()) {
        state.multicalls += 1;
        const { functionName, args } = decodeFunctionData({ abi: multicall2Abi, data: call.data });
        expect(functionName).toBe('tryAggregate');
        expect(args[0]).toBe(false);
        const results = args[1].map(({ target, callData }) => {
          expect(target.toLowerCase()).toBe(STUDENT_REGISTRATION_ADDRESS.toLowerCase());
          const { args: studentArgs } = decodeFunctionData({
            abi: studentRegistrationAbi,
            data: callData,
          });
          const record = records.get(studentArgs[0].toLowerCase());
          return record
            ? { success: true, returnData: studentResult(record) }
            : { success: false, returnData: revert('Student not registered') };
        });
        return response(
          encodeFunctionResult({ abi: multicall2Abi, functionName, result: results }),
        );
      }
      const { functionName, args } = decodeFunctionData({
        abi: studentRegistrationAbi,
        data: call.data,
      });
      const record = records.get(args[0]?.toLowerCase?.());
      if (functionName === 'registered')
        return response(
          encodeFunctionResult({
            abi: studentRegistrationAbi,
            functionName,
            result: Boolean(record),
          }),
        );
      if (functionName === 'getStudent')
        return record ? response(studentResult(record)) : error('Student not registered');
      if (functionName === 'register')
        return records.has(call.from.toLowerCase())
          ? error('Student already registered')
          : response('0x');
    }
    if (method === 'eth_sendTransaction') {
      const transaction = params[0];
      expect(transaction.to.toLowerCase()).toBe(STUDENT_REGISTRATION_ADDRESS.toLowerCase());
      state.transactions.push(transaction);
      const { args } = decodeFunctionData({ abi: studentRegistrationAbi, data: transaction.data });
      state.pending = {
        address: transaction.from.toLowerCase(),
        name: args[0],
        age: args[1].toString(),
        course: args[2],
      };
      return response(HASH);
    }
    if (method === 'eth_getTransactionReceipt') {
      if (!state.pending) return response(null);
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (!options.reverted) records.set(state.pending.address, state.pending);
      return response({
        transactionHash: HASH,
        transactionIndex: '0x0',
        blockHash: BLOCK_HASH,
        blockNumber: '0x64',
        from: state.pending.address,
        to: STUDENT_REGISTRATION_ADDRESS,
        cumulativeGasUsed: '0x20000',
        gasUsed: '0x20000',
        contractAddress: null,
        logs: [],
        logsBloom: `0x${'0'.repeat(512)}`,
        status: options.reverted ? '0x0' : '0x1',
        effectiveGasPrice: '0x3b9aca00',
        type: '0x2',
      });
    }
    if (method === 'eth_getTransactionByHash')
      return response({
        hash: HASH,
        blockHash: BLOCK_HASH,
        blockNumber: '0x64',
        transactionIndex: '0x0',
        from: state.pending?.address || NEW,
        to: STUDENT_REGISTRATION_ADDRESS,
        input: state.transactions[0]?.data || '0x',
        value: '0x0',
        gas: '0x493e0',
        gasPrice: '0x3b9aca00',
        nonce: '0x1',
        type: '0x2',
        chainId: '0xaa36a7',
        maxFeePerGas: '0x77359400',
        maxPriorityFeePerGas: '0x3b9aca00',
        accessList: [],
        v: '0x0',
        r: `0x${'1'.repeat(64)}`,
        s: `0x${'2'.repeat(64)}`,
      });
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: { code: -32601, message: `Unhandled test RPC method: ${method}` },
    };
  }

  await page.route('**/test-rpc', async (route) => {
    const body = route.request().postDataJSON();
    return route.fulfill({
      json: Array.isArray(body) ? await Promise.all(body.map(rpc)) : await rpc(body),
    });
  });
  await page.goto('/');
  return state;
}

async function connect(page) {
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /Browser wallet|MetaMask/ }).click();
  await expect(dialog).not.toBeVisible();
}

test('directory discovers ordinary and smart-wallet students and supports search, filtering, and export', async ({
  page,
}) => {
  const state = await setup(page);
  await expect(page.getByRole('table').getByText('Ada Okafor', { exact: true })).toBeVisible();
  await expect(page.getByRole('table').getByText('Bola Adeyemi', { exact: true })).toBeVisible();
  expect(state.multicalls).toBeGreaterThan(0);
  await page.getByRole('textbox', { name: 'Search students' }).fill('Bola');
  await expect(page.getByRole('table').getByText('Ada Okafor', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('table').getByText('Bola Adeyemi', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search students' }).fill('');
  await page.getByRole('combobox', { name: 'Filter by course' }).selectOption('Computer Science');
  await expect(page.getByRole('table').getByText('Bola Adeyemi', { exact: true })).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export list' }).click();
  expect((await download).suggestedFilename()).toBe('campus-students.csv');
  await page.getByRole('combobox', { name: 'Filter by course' }).selectOption('');
  await page.screenshot({ path: '/private/tmp/campus-desktop.png', fullPage: true });
});

test('registration confirms before creating a card and appears despite indexing lag', async ({
  page,
}) => {
  const state = await setup(page);
  await connect(page);
  await expect(page.getByText('Not registered yet', { exact: true })).toBeVisible();
  await page.getByLabel('Full name').fill('Chika Nwosu');
  await page.getByRole('textbox', { name: 'Age *', exact: true }).fill('22');
  await page.getByLabel('Course of study').fill('Architecture');
  await page.getByRole('button', { name: 'Register student', exact: true }).click();
  await expect(page.getByText('Registration confirmed on Sepolia.')).toBeVisible();
  await expect(
    page.locator('#my-profile').getByRole('heading', { name: 'Chika Nwosu' }),
  ).toBeVisible();
  await expect(page.getByRole('table').getByText('Chika Nwosu')).toBeVisible();
  expect(state.transactions).toHaveLength(1);
  await expect(page.getByRole('button', { name: 'Register student', exact: true })).toHaveCount(0);
});

test('wallet changes replace the profile and wrong networks require switching', async ({
  page,
}) => {
  await setup(page, { address: ADA });
  await connect(page);
  await expect(
    page.locator('#my-profile').getByRole('heading', { name: 'Ada Okafor' }),
  ).toBeVisible();
  await page.evaluate((address) => window.__changeWallet(address), NEW);
  await expect(page.getByText('Not registered yet', { exact: true })).toBeVisible();
  await expect(
    page.locator('#my-profile').getByRole('heading', { name: 'Ada Okafor' }),
  ).toHaveCount(0);
  await page.evaluate(() => window.__changeChain('0x1'));
  await page.setViewportSize({ width: 320, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Switch to Sepolia to register' })).toBeDisabled();
  await page.getByRole('button', { name: 'Switch to Sepolia', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Register student', exact: true })).toBeEnabled();
});

for (const [name, option, message] of [
  ['wallet rejection', 'reject', 'The wallet request was declined.'],
  ['reverted receipt', 'reverted', 'The contract could not complete this request.'],
]) {
  test(`${name} never shows a successful registration`, async ({ page }) => {
    await setup(page, { [option]: true });
    await connect(page);
    await page.getByLabel('Full name').fill('Chika Nwosu');
    await page.getByRole('textbox', { name: 'Age *', exact: true }).fill('22');
    await page.getByLabel('Course of study').fill('Architecture');
    await page.getByRole('button', { name: 'Register student', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
    await expect(page.getByText('Registration confirmed on Sepolia.')).toHaveCount(0);
    await expect(page.getByText('Not registered yet', { exact: true })).toBeVisible();
  });
}

test('partial history is disclosed and mobile layout has no page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, { internalFailure: true });
  await expect(
    page.getByText('Some records may be missing or out of date.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('table').getByText('Ada Okafor', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Student directory' }).click();
  await page.screenshot({ path: '/private/tmp/campus-mobile.png', fullPage: true });
});

test('an unavailable explorer shows a retry state rather than an empty complete directory', async ({
  page,
}) => {
  await setup(page, { historyFailure: true });
  await expect(page.getByRole('heading', { name: 'We couldn’t load the directory' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
});

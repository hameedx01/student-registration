import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeFunctionData, encodeErrorResult, encodeFunctionResult } from 'viem';
import { multicall2Abi } from '../../src/abi/multicall2Abi.js';
import { studentRegistrationAbi } from '../../src/abi/studentRegistrationAbi.js';
import { MULTICALL2_ADDRESS, STUDENT_REGISTRATION_ADDRESS } from '../../src/config/contracts.js';
import { fetchStudentsMulticall } from '../../src/utils/fetchStudentsMulticall.js';
import {
  collectCandidates,
  discoverStudentAddresses,
  readHistory,
} from '../../src/utils/studentHistory.js';
import { validateRegistration } from '../../src/utils/validation.js';
import { readStudent } from '../../src/utils/readStudent.js';

const A = '0x1111111111111111111111111111111111111111';
const B = '0x2222222222222222222222222222222222222222';
const C = '0x3333333333333333333333333333333333333333';
const resultFor = (name, age = 20n) =>
  encodeFunctionResult({
    abi: studentRegistrationAbi,
    functionName: 'getStudent',
    result: [name, age, 'Mathematics'],
  });
const unregisteredError = encodeErrorResult({
  abi: [{ type: 'error', name: 'Error', inputs: [{ name: 'message', type: 'string' }] }],
  errorName: 'Error',
  args: ['Student not registered'],
});

test('Multicall2 uses tryAggregate via a direct call and keeps batches on one block', async () => {
  let calls = 0;
  const client = {
    getBlockNumber: async () => 1234n,
    call: async ({ to, data, blockNumber, batch }) => {
      assert.equal(to, MULTICALL2_ADDRESS);
      assert.equal(blockNumber, 1234n);
      assert.equal(batch, false);
      const decoded = decodeFunctionData({ abi: multicall2Abi, data });
      assert.equal(decoded.functionName, 'tryAggregate');
      assert.equal(decoded.args[0], false);
      assert.equal(decoded.args[1].length, 1);
      const target = decoded.args[1][0];
      assert.equal(target.target.toLowerCase(), STUDENT_REGISTRATION_ADDRESS.toLowerCase());
      const student = decodeFunctionData({ abi: studentRegistrationAbi, data: target.callData });
      assert.equal(student.functionName, 'getStudent');
      assert.equal(student.args[0], calls === 0 ? A : B);
      calls += 1;
      return {
        data: encodeFunctionResult({
          abi: multicall2Abi,
          functionName: 'tryAggregate',
          result: [{ success: true, returnData: resultFor(`Student ${calls}`, 9007199254740993n) }],
        }),
      };
    },
  };
  const result = await fetchStudentsMulticall(client, [A, A, B], { batchSize: 1 });
  assert.equal(calls, 2);
  assert.deepEqual(
    result.students.map((student) => student.address),
    [A, B],
  );
  assert.equal(result.students[0].age, '9007199254740993');
  assert.deepEqual(result.failures, []);
});

test('an unregistered candidate is skipped while malformed results remain visible as failures', async () => {
  const client = {
    getBlockNumber: async () => 100n,
    call: async () => ({
      data: encodeFunctionResult({
        abi: multicall2Abi,
        functionName: 'tryAggregate',
        result: [
          { success: true, returnData: resultFor('Ada') },
          { success: false, returnData: unregisteredError },
          { success: true, returnData: '0x' },
        ],
      }),
    }),
  };
  const result = await fetchStudentsMulticall(client, [A, B, C]);
  assert.equal(result.students.length, 1);
  assert.equal(result.students[0].name, 'Ada');
  assert.deepEqual(result.failures, [C]);
});

test('empty directories do not make RPC calls; invalid addresses and failed batches reject', async () => {
  assert.deepEqual(await fetchStudentsMulticall({}, []), {
    students: [],
    failures: [],
    blockNumber: null,
  });
  await assert.rejects(fetchStudentsMulticall({}, ['invalid']), /invalid wallet/);
  await assert.rejects(
    fetchStudentsMulticall(
      {
        getBlockNumber: async () => 1n,
        call: async () => {
          throw new Error('RPC unavailable');
        },
      },
      [A],
    ),
    /RPC unavailable/,
  );
});

function direct(from = A) {
  return {
    from: { hash: from },
    to: { hash: STUDENT_REGISTRATION_ADDRESS },
    raw_input: '0x637a0832',
    status: 'ok',
    result: 'success',
  };
}

test('discovery excludes failed direct registrations and uses the immediate internal caller', () => {
  assert.deepEqual(
    collectCandidates(
      [direct(), { ...direct(B), status: 'error' }, { ...direct(C), raw_input: '0xb2dd5c07' }],
      'transactions',
    ),
    [A],
  );
  assert.deepEqual(
    collectCandidates(
      [
        { ...direct(B), success: true, type: 'call', transaction: { from: { hash: A } } },
        { ...direct(C), success: true, type: 'delegatecall' },
        { ...direct(A), success: false, type: 'call' },
      ],
      'internal-transactions',
    ),
    [B],
  );
});

test('history follows every page and deduplicates callers', async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    const second = new URL(url).searchParams.has('block_number');
    return {
      ok: true,
      json: async () => ({
        items: second ? [direct(A), direct(B)] : [direct()],
        next_page_params: second ? null : { block_number: 10, index: 1 },
      }),
    };
  };
  assert.deepEqual(await readHistory('transactions', { fetchImpl }), [A, B]);
  assert.equal(requests.length, 2);
  assert.equal(new URL(requests[1]).searchParams.get('filter'), 'to');
});

test('partial explorer availability is explicitly reported rather than called complete', async () => {
  const fetchImpl = async (url) =>
    url.includes('internal-transactions')
      ? { ok: false, status: 503 }
      : { ok: true, json: async () => ({ items: [direct()], next_page_params: null }) };
  const result = await discoverStudentAddresses({ fetchImpl });
  assert.deepEqual(result.addresses, [A]);
  assert.equal(result.complete, false);
  await assert.rejects(
    discoverStudentAddresses({ fetchImpl: async () => ({ ok: false, status: 500 }) }),
    /couldn’t load/,
  );
});

test('repeated pagination cursors reject rather than showing a truncated directory', async () => {
  await assert.rejects(
    readHistory('transactions', {
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ items: [direct()], next_page_params: { block_number: 10 } }),
      }),
    }),
    /repeated page/,
  );
});

test('wallet profile distinguishes an unregistered wallet from a read failure', async () => {
  assert.equal((await readStudent({ readContract: async () => false }, A)).registered, false);
  await assert.rejects(
    readStudent(
      {
        readContract: async () => {
          throw new Error('network');
        },
      },
      A,
    ),
    /network/,
  );
});

test('registration validates nonempty fields and exact uint256 input', () => {
  assert.deepEqual(validateRegistration({ name: 'Ada', age: '21', course: 'Maths' }), {});
  for (const age of ['-1', '2.5', '2e1', '', (1n << 256n).toString()])
    assert.ok(validateRegistration({ name: 'Ada', age, course: 'Maths' }).age);
  assert.ok(validateRegistration({ name: ' ', age: '20', course: ' ' }).name);
  assert.ok(validateRegistration({ name: ' ', age: '20', course: ' ' }).course);
});

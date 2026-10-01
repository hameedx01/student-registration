import assert from 'node:assert/strict';
import { publicClient } from '../src/config/publicClient.js';
import { CHAIN_ID, MULTICALL2_ADDRESS } from '../src/config/contracts.js';
import { discoverStudentAddresses } from '../src/utils/studentHistory.js';
import { fetchStudentsMulticall } from '../src/utils/fetchStudentsMulticall.js';

// This smoke check only reads public data. It never requests a signer or sends a transaction.
const chainId = await publicClient.getChainId();
assert.equal(chainId, CHAIN_ID, 'The RPC must be connected to Sepolia.');
const history = await discoverStudentAddresses();
assert.equal(
  history.complete,
  true,
  'Both direct transactions and internal traces must be available.',
);
const result = await fetchStudentsMulticall(publicClient, history.addresses);
assert.equal(
  result.failures.length,
  0,
  'Every discovered record must decode or be explicitly unregistered.',
);
console.log(
  JSON.stringify(
    {
      chainId,
      multicall2: MULTICALL2_ADDRESS,
      discoveredAddresses: history.addresses.length,
      confirmedStudents: result.students.length,
      blockNumber: result.blockNumber,
      transactionSent: false,
    },
    null,
    2,
  ),
);

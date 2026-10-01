import {
  decodeErrorResult,
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  isAddress,
} from 'viem';
import { multicall2Abi } from '../abi/multicall2Abi.js';
import { studentRegistrationAbi } from '../abi/studentRegistrationAbi.js';
import { MULTICALL2_ADDRESS, STUDENT_REGISTRATION_ADDRESS } from '../config/contracts.js';

export async function fetchStudentsMulticall(client, addresses, { signal, batchSize = 40 } = {}) {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1)
    throw new Error('Invalid multicall batch size.');
  const normalized = addresses.map((address) => {
    if (!isAddress(address, { strict: false }))
      throw new Error('The directory contains an invalid wallet address.');
    return getAddress(address.toLowerCase());
  });
  const unique = [...new Set(normalized)];
  if (!unique.length) return { students: [], failures: [], blockNumber: null };

  // Pin every batch to one block so large directories are internally consistent.
  const blockNumber = await client.getBlockNumber({ cacheTime: 0 });
  const students = [];
  const failures = [];
  for (let offset = 0; offset < unique.length; offset += batchSize) {
    signal?.throwIfAborted();
    const batch = unique.slice(offset, offset + batchSize);
    const calls = batch.map((address) => ({
      target: STUDENT_REGISTRATION_ADDRESS,
      callData: encodeFunctionData({
        abi: studentRegistrationAbi,
        functionName: 'getStudent',
        args: [address],
      }),
    }));
    const data = encodeFunctionData({
      abi: multicall2Abi,
      functionName: 'tryAggregate',
      args: [false, calls],
    });
    // eth_call directly to the user's Multicall2. No Multicall3, signer, or transaction.
    const response = await client.call({ to: MULTICALL2_ADDRESS, data, blockNumber, batch: false });
    if (!response.data)
      throw new Error('Multicall2 returned no data. Check the RPC network and contract address.');
    const results = decodeFunctionResult({
      abi: multicall2Abi,
      functionName: 'tryAggregate',
      data: response.data,
    });
    if (results.length !== batch.length)
      throw new Error('Multicall2 returned an unexpected number of results.');
    results.forEach(({ success, returnData }, index) => {
      const address = batch[index];
      if (!success) {
        // Incoming traces also include non-register calls. Exclude genuinely unregistered callers.
        try {
          const decoded = decodeErrorResult({ abi: studentRegistrationAbi, data: returnData });
          if (decoded.errorName === 'Error' && decoded.args[0] === 'Student not registered') return;
        } catch {
          /* Preserve any other error as a failed row instead of hiding it. */
        }
        failures.push(address);
        return;
      }
      try {
        const [name, age, course] = decodeFunctionResult({
          abi: studentRegistrationAbi,
          functionName: 'getStudent',
          data: returnData,
        });
        students.push({ address, name, age: age.toString(), course });
      } catch {
        failures.push(address);
      }
    });
  }
  signal?.throwIfAborted();
  return { students, failures, blockNumber: blockNumber.toString() };
}

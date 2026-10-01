import { getAddress, isAddress, toFunctionSelector } from 'viem';
import { BLOCKSCOUT_API_URL, STUDENT_REGISTRATION_ADDRESS } from '../config/contracts.js';

const REGISTER_SELECTOR = toFunctionSelector('register(string,uint256,string)');
const MAX_PAGES = 500;

export function collectCandidates(items, kind) {
  return items.flatMap((item) => {
    const to = item.to?.hash;
    const from = item.from?.hash;
    if (
      to?.toLowerCase() !== STUDENT_REGISTRATION_ADDRESS.toLowerCase() ||
      !isAddress(from || '', { strict: false })
    )
      return [];
    if (kind === 'transactions') {
      if (
        item.status !== 'ok' ||
        item.result !== 'success' ||
        !item.raw_input?.startsWith(REGISTER_SELECTOR)
      )
        return [];
    } else {
      // Use the immediate caller, not the outer transaction's sender: this includes smart wallets.
      // Trace listings omit input data, so confirm each candidate on-chain through getStudent.
      if (!item.success || item.error || item.type !== 'call') return [];
    }
    return [getAddress(from.toLowerCase())];
  });
}

export async function readHistory(
  kind,
  { signal, fetchImpl = fetch, apiUrl = BLOCKSCOUT_API_URL } = {},
) {
  const addresses = new Set();
  const cursors = new Set();
  let params = { filter: 'to' };
  for (let page = 0; page < MAX_PAGES; page += 1) {
    signal?.throwIfAborted();
    const query = new URLSearchParams({ ...params, filter: 'to' });
    const cursor = query.toString();
    if (cursors.has(cursor))
      throw new Error('The directory service returned a repeated page. Please retry.');
    cursors.add(cursor);
    const requestSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(20_000)])
      : AbortSignal.timeout(20_000);
    const response = await fetchImpl(
      `${apiUrl}/addresses/${STUDENT_REGISTRATION_ADDRESS}/${kind}?${query}`,
      { signal: requestSignal },
    );
    if (!response.ok) throw new Error(`The directory service is unavailable (${response.status}).`);
    const data = await response.json();
    if (!Array.isArray(data.items))
      throw new Error('The directory service returned an unexpected response.');
    collectCandidates(data.items, kind).forEach((address) => addresses.add(address));
    if (!data.next_page_params || Object.keys(data.next_page_params).length === 0)
      return [...addresses];
    params = data.next_page_params;
  }
  throw new Error(
    'The directory history exceeded the scan limit. A dedicated indexer is needed for this registry size.',
  );
}

export async function discoverStudentAddresses(options = {}) {
  const results = await Promise.allSettled([
    readHistory('transactions', options),
    readHistory('internal-transactions', options),
  ]);
  options.signal?.throwIfAborted();
  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  if (!fulfilled.length)
    throw new Error('We couldn’t load the student directory. Check your connection and try again.');
  return {
    addresses: [...new Set(fulfilled.flatMap((result) => result.value))],
    complete: fulfilled.length === results.length,
  };
}

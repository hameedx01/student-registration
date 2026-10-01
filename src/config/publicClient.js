import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { RPC_URL } from './contracts.js';

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL, { timeout: 20_000, retryCount: 1 }),
  // Explicit Multicall2 calls are made in fetchStudentsMulticall.js.
  batch: { multicall: false },
});

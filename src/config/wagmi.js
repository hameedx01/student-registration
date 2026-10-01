import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { RPC_URL } from './contracts.js';

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: { [sepolia.id]: http(RPC_URL) },
  batch: { multicall: false },
});

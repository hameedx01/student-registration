export const CHAIN_ID = 11155111;
export const STUDENT_REGISTRATION_ADDRESS = '0xa551cb621e1b7b2350049d842bf73C1c4e89a126';
export const MULTICALL2_ADDRESS = '0xB8A30476424DF1b2954e9a934a66fC52463C62cD';
export const EXPLORER_URL = 'https://sepolia.etherscan.io';
const env = import.meta.env ?? {};
export const RPC_URL = env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
export const BLOCKSCOUT_API_URL = (
  env.VITE_BLOCKSCOUT_API_URL || 'https://eth-sepolia.blockscout.com/api/v2'
).replace(/\/$/, '');

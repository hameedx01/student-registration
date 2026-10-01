# Campus — student registration

A React + Vite application written in JavaScript. Connect a browser wallet, register yourself on Sepolia, view your student card, and browse the student directory using the deployed **Multicall2** contract.

## Run locally

Use Node.js 22.12 or newer and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The directory works without connecting a wallet. To register, connect MetaMask or another injected browser wallet, select Sepolia, and have enough Sepolia test ETH for gas.

No API key is required for the default public services. To use a different provider, copy `.env.example` to `.env.local`, change the RPC or Blockscout URL, and restart Vite. Vite environment variables are included in the browser bundle; do not put private keys or other secrets in them.

## Deployed contracts

Both contracts are on Ethereum Sepolia, chain ID `11155111`.

| Contract            | Address                                      |
| ------------------- | -------------------------------------------- |
| StudentRegistration | `0xa551cb621e1b7b2350049d842bf73C1c4e89a126` |
| Multicall2          | `0xB8A30476424DF1b2954e9a934a66fC52463C62cD` |

The original Multicall2 source remains in `contracts/Multicall2.sol` for reference. The frontend uses the deployed contract above and does not compile or redeploy Solidity.

## How the features work

**Registration:** the form validates name, age, and course, simulates `register`, requests a transaction from the connected wallet, and waits for a successful receipt. A hash alone is not treated as success. Duplicate registration, wallet rejection, incorrect networks, reverted transactions, and transaction replacement are handled. The transaction goes directly to StudentRegistration so `msg.sender` is the student wallet. Details are public, and this contract has no update or delete function.

**My student card:** `registered(connectedAddress)` determines whether to call `getStudent(connectedAddress)`. Queries are keyed by wallet address, so changing accounts changes the card. Reads always target Sepolia, even when the wallet needs to switch networks before a write.

**Student directory:** the existing contract has no address-list getter, count, or registration events. The app discovers candidate addresses from the public Blockscout index:

1. Page through successful direct `register` transactions.
2. Page through successful incoming internal `CALL` traces. Use each trace's immediate caller to include smart-wallet registrations, rather than assuming the outer transaction sender is the student.
3. Deduplicate those callers and confirm student details through Multicall2. Unregistered candidates are excluded; unexpected failures cause a partial-results notice.

Both history streams must finish for the current result to be marked complete. Explorer failures are not presented as a complete empty registry. Completeness still depends on Blockscout's indexing coverage and freshness; new registrations can take time to appear. A production registry at larger scale should use a dedicated indexer, or a new student contract with an enumerable list or registration events.

Recently confirmed addresses are also remembered in this browser to bridge indexing delays. This is a supplement to public history, not the only source of students. The directory refreshes every minute and has a manual refresh button, name/course/wallet search, course filtering, pagination, and CSV export.

**Multicall2:** `fetchStudentsMulticall.js` encodes each `getStudent(address)` using the student ABI, then calls `tryAggregate(false, calls)` on your Multicall2 address using `eth_call`. It decodes each successful result with the student ABI. It makes no wallet transaction, uses no Multicall3, and does not use Wagmi's `useReadContracts`. Batches contain at most 40 lookups, all pinned to the same block.

## Files to learn from

```text
src/
  abi/                         Contract function definitions
  config/                      Addresses, Sepolia RPC, and Wagmi configuration
  providers/Web3Provider.jsx   Wallet and query providers
  components/
    ConnectWallet.jsx          Wallet connection and network switching
    RegisterStudent.jsx        Form, validation feedback, and transaction progress
    StudentProfile.jsx         Connected wallet's student card
    StudentList.jsx            Directory, search, filters, pagination, and export
  hooks/
    useRegisterStudent.js      Simulation, wallet transaction, receipt, and refresh
    useStudent.js              Registration status and individual student queries
    useStudentDirectory.js     History discovery and batched student queries
  utils/
    studentHistory.js          Paginated direct and internal registration discovery
    fetchStudentsMulticall.js  Explicit Multicall2 encoding, call, and decoding
    readStudent.js             Individual student reads
    validation.js              Form validation and uint256 handling
    format.js                  Names, addresses, and readable errors
  App.jsx                      Page layout
  main.jsx                     React entry point
  index.css                    Responsive styles
```

## Checks

```sh
npm run lint
npm test
npm run build
npm run test:e2e
npm run check:live
```

Unit tests cover Multicall2 encoding and decoding, failed lookups, large integers, registration validation, address discovery, pagination, and partial explorer responses.

Browser tests require Google Chrome. They start an isolated Vite server on port 4174 and simulate wallet/RPC/explorer responses. They exercise registration, confirmation, account changes, network switching, rejected and reverted transactions, directory controls, and mobile layout. They never submit a real transaction.

The live check reads the public explorer and both existing contracts on Sepolia. It checks the network, discovers candidates, and reads their details through Multicall2. It never requests a wallet or sends a transaction.

Use `npm run preview` to serve the production build after `npm run build`.

With the dev server running on port 5173, `npm run check:browser` checks the live directory in Chrome, captures desktop/mobile screenshots in the system temporary folder, and checks for browser errors and horizontal page overflow. Use `npm run format` to format the JavaScript, JSX, CSS, and documentation.

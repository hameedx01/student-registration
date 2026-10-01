import { useEffect, useRef, useState } from 'react';
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain } from 'wagmi';
import { ArrowUpRight, Check, ChevronDown, LoaderCircle, LogOut, Wallet, X } from 'lucide-react';
import { CHAIN_ID } from '../config/contracts.js';
import { friendlyError, shortAddress } from '../utils/format.js';

function WalletOption({ connector, disabled, onConnect }) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    connector
      .getProvider()
      .then((provider) => {
        if (active) setAvailable(Boolean(provider));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [connector]);
  return (
    <button
      className="wallet-option"
      disabled={disabled || !available}
      onClick={() => onConnect(connector)}
    >
      <span className="wallet-option-icon">
        <Wallet size={22} />
      </span>
      <span>
        <strong>{connector.name === 'Injected' ? 'Browser wallet' : connector.name}</strong>
        <small>
          {available ? 'Connect securely with your wallet' : 'No browser extension detected'}
        </small>
      </span>
      <ArrowUpRight size={18} />
    </button>
  );
}

export default function ConnectWallet({ open, onOpen, onClose }) {
  const dialog = useRef(null);
  const { address, chainId, isConnected, isReconnecting } = useConnection();
  const connectors = useConnectors();
  const { connectAsync, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();

  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    if (!open && dialog.current.open) dialog.current.close();
  }, [open]);

  async function connect(connector) {
    reset();
    try {
      await connectAsync({ connector, chainId: CHAIN_ID });
      onClose();
    } catch {
      /* The hook exposes the error in the dialog. */
    }
  }

  return (
    <>
      {isConnected ? (
        <div className="wallet-connected">
          {chainId !== CHAIN_ID && (
            <button
              className="button button-warning"
              disabled={isSwitching}
              onClick={() => switchChain({ chainId: CHAIN_ID })}
            >
              {isSwitching ? 'Switching…' : 'Switch to Sepolia'}
            </button>
          )}
          <button className="button button-wallet" onClick={onOpen}>
            <span className="wallet-dot" />
            {shortAddress(address)}
            <ChevronDown size={15} />
          </button>
        </div>
      ) : (
        <button
          className="button button-primary connect-button"
          onClick={onOpen}
          disabled={isReconnecting}
        >
          <Wallet size={17} />
          {isReconnecting ? 'Reconnecting…' : 'Connect wallet'}
        </button>
      )}
      {switchError && (
        <p role="alert" className="header-wallet-error">
          {friendlyError(switchError)}
        </p>
      )}
      <dialog
        ref={dialog}
        className="wallet-dialog"
        aria-labelledby="wallet-dialog-title"
        onCancel={onClose}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="dialog-content">
          <button
            className="icon-button dialog-close"
            aria-label="Close wallet dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
          <div className="dialog-symbol">
            <Wallet size={27} />
          </div>
          <h2 id="wallet-dialog-title">
            {isConnected ? 'Your connected wallet' : 'Your journey starts here'}
          </h2>
          <p className="muted">
            {isConnected
              ? 'This wallet identifies your student record.'
              : 'Connect a browser wallet to register and access your student card.'}
          </p>
          {isConnected ? (
            <>
              <p className="wallet-full-address">{address}</p>
              <p className="network-label">
                <Check size={15} />
                Wallet connected
              </p>
              <button
                className="button button-secondary full-width"
                onClick={() => {
                  disconnect();
                  onClose();
                }}
              >
                <LogOut size={17} />
                Disconnect wallet
              </button>
            </>
          ) : (
            <>
              <div className="wallet-options">
                {connectors.map((connector) => (
                  <WalletOption
                    key={connector.uid}
                    connector={connector}
                    disabled={isPending}
                    onConnect={connect}
                  />
                ))}
              </div>
              {isPending && (
                <p role="status" className="inline-status">
                  <LoaderCircle className="spin" size={16} />
                  Approve the connection in your wallet.
                </p>
              )}
              {error && (
                <p role="alert" className="error-message">
                  {friendlyError(error)}
                </p>
              )}
              <p className="dialog-footnote">
                You’ll need a browser wallet such as MetaMask and Sepolia test ETH to register.
              </p>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

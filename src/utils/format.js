export function shortAddress(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
}

export function initials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0] || '')
      .join('')
      .toUpperCase() || '?'
  );
}

export function friendlyError(error) {
  const text = [error?.shortMessage, error?.message, error?.cause?.message]
    .filter(Boolean)
    .join(' ');
  if (/user rejected|user denied|rejected the request/i.test(text))
    return 'The wallet request was declined. You can try again when you’re ready.';
  if (/insufficient funds/i.test(text))
    return 'Your wallet needs Sepolia test ETH to cover the transaction fee.';
  if (/Student already registered/i.test(text))
    return 'This wallet is already registered. Refresh to load your student card.';
  if (/chain.*mismatch|chain.*does not match|wrong network/i.test(text))
    return 'Switch your wallet to Sepolia and try again.';
  if (/cancelled|canceled/i.test(text))
    return 'The registration transaction was cancelled or replaced. Check your wallet before trying again.';
  if (/revert/i.test(text))
    return 'The contract could not complete this request. Refresh your registration status and try again.';
  if (/fetch|network|HTTP|timeout|timed out|limit exceeded|429/i.test(text))
    return 'The network is taking longer than expected. Please try again shortly.';
  return error?.shortMessage || error?.message || 'Something went wrong. Please try again.';
}

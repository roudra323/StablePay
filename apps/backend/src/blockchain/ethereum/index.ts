// Ethereum module exports
export {
  getPublicClient,
  getWalletClient,
  getBlockNumber,
  getBalance,
  waitForTransaction,
} from "./provider.js";

export {
  watchDepositedEvents,
  watchAllowedStablecoinEvents,
  getHistoricalDepositedEvents,
  getHistoricalAllowedStablecoinEvents,
  createVaultEventWatcher,
  type DepositedEvent,
  type AllowedStablecoinEvent,
  type DepositedEventHandler,
  type AllowedStablecoinEventHandler,
} from "./vault.listener.js";

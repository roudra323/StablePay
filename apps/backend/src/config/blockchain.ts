// Blockchain configuration
import { sepolia, hardhat, mainnet, type Chain } from "viem/chains";
import { env } from "./env.js";

export const SUPPORTED_CHAINS: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
  31337: hardhat,
};

export const getChain = (chainId: number): Chain => {
  const chain = SUPPORTED_CHAINS[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return chain;
};

export const getCurrentChain = (): Chain => getChain(env.CHAIN_ID);

export const blockchainConfig = {
  chainId: env.CHAIN_ID,
  rpcUrl: env.RPC_URL,
  chain: getCurrentChain(),

  // Block confirmations required for finality
  confirmations: env.NODE_ENV === "production" ? 12 : 1,

  // Polling interval for event watching (in ms)
  pollingInterval: env.NODE_ENV === "production" ? 12_000 : 1_000,
} as const;

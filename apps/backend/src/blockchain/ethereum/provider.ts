// Ethereum provider setup using Viem
import {
    createPublicClient,
    createWalletClient,
    http,
    type Hex, type Address,
    type PublicClient,
    type WalletClient,
    Transport, type Chain,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { blockchainConfig } from "../../config/blockchain.js";
import { env } from "../../config/env.js";

// Create a singleton public client for read operations
const createEthereumPublicClient = () =>
    createPublicClient({
        chain: blockchainConfig.chain,
        transport: http(blockchainConfig.rpcUrl),
        batch: {
            multicall: true,
        },
        pollingInterval: blockchainConfig.pollingInterval,
    });

// Create a wallet client for write operations (requires private key)
const createEthereumWalletClient = (privateKey: Hex) => {
    const account = privateKeyToAccount(privateKey);

    return createWalletClient({
        account,
        chain: blockchainConfig.chain,
        transport: http(blockchainConfig.rpcUrl),
    });
};

// Singleton instances
let publicClientInstance: PublicClient<Transport, Chain> | null = null;
let walletClientInstance: WalletClient<Transport, Chain> | null = null;


export const getPublicClient = () => {
    if (!publicClientInstance) {
        publicClientInstance = createEthereumPublicClient();
    }
    return publicClientInstance;
};

export const getWalletClient = () => {
    if (!walletClientInstance) {
        if (!env.PRIVATE_KEY) {
            throw new Error("PRIVATE_KEY environment variable is required for write operations");
        }
        walletClientInstance = createEthereumWalletClient(env.PRIVATE_KEY as Hex);
    }
    return walletClientInstance;
};

// Utility functions for common operations
export const getBlockNumber = async (): Promise<bigint> => {
    const client = getPublicClient();
    return client.getBlockNumber();
};

export const getBalance = async (address: Address): Promise<bigint> => {
    const client = getPublicClient();
    return client.getBalance({ address });
};

export const waitForTransaction = async (
    hash: Hex,
    confirmations: number = blockchainConfig.confirmations
) => {
    const client = getPublicClient();
    return client.waitForTransactionReceipt({
        hash,
        confirmations,
    });
};

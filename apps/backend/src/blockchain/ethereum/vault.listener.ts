// Vault event listener using Viem
import type { WatchEventReturnType, Address } from "viem";
import { getPublicClient } from "./provider.js";
import { STABLECOIN_VAULT_ADDRESS } from "../contracts.js";
import { blockchainConfig } from "../../config/blockchain.js";
import { logger } from "../../utils/logger.js";

// Event types derived from the contract
export type DepositedEvent = {
    tokenAddress: Address;
    user: Address;
    amount: bigint;
    refId: string;
    blockNumber: bigint;
    transactionHash: Address;
    logIndex: number;
};

export type AllowedStablecoinEvent = {
    tokenAddress: Address;
    timestamp: bigint;
    owner: Address;
    blockNumber: bigint;
    transactionHash: Address;
    logIndex: number;
};

export type DepositedEventHandler = (event: DepositedEvent) => Promise<void>;
export type AllowedStablecoinEventHandler = (event: AllowedStablecoinEvent) => Promise<void>;

const getVaultAddress = (): Address => {
    const address = STABLECOIN_VAULT_ADDRESS[blockchainConfig.chainId];
    if (!address) {
        throw new Error(`No vault address configured for chain ${blockchainConfig.chainId}`);
    }
    return address;
};

// Watch for Deposited events in real-time
export const watchDepositedEvents = (
    onDeposit: DepositedEventHandler,
    onError?: (error: Error) => void
): WatchEventReturnType => {
    const client = getPublicClient();
    const vaultAddress = getVaultAddress();

    logger.info(`Starting to watch Deposited events on ${vaultAddress}`);

    return client.watchEvent({
        address: vaultAddress,
        event: {
            type: "event",
            name: "Deposited",
            inputs: [
                { type: "address", name: "tokenAddress", indexed: true },
                { type: "address", name: "user", indexed: true },
                { type: "uint256", name: "amount", indexed: false },
                { type: "bytes32", name: "refId", indexed: true },
            ],
        },
        onLogs: async (logs) => {
            for (const log of logs) {
                try {
                    const event: DepositedEvent = {
                        tokenAddress: log.args.tokenAddress as Address,
                        user: log.args.user as Address,
                        amount: log.args.amount as bigint,
                        refId: log.args.refId as string,
                        blockNumber: log.blockNumber,
                        transactionHash: log.transactionHash,
                        logIndex: log.logIndex,
                    };
                    await onDeposit(event);
                } catch (error) {
                    logger.error("Error processing Deposited event:", error);
                    onError?.(error as Error);
                }
            }
        },
        onError: (error) => {
            logger.error("Error watching Deposited events:", error);
            onError?.(error);
        },
    });
};

// Watch for AllowedStablecoin events in real-time
export const watchAllowedStablecoinEvents = (
    onAllowed: AllowedStablecoinEventHandler,
    onError?: (error: Error) => void
): WatchEventReturnType => {
    const client = getPublicClient();
    const vaultAddress = getVaultAddress();

    logger.info(`Starting to watch AllowedStablecoin events on ${vaultAddress}`);

    return client.watchEvent({
        address: vaultAddress,
        event: {
            type: "event",
            name: "AllowedStablecoin",
            inputs: [
                { type: "address", name: "tokenAddress", indexed: true },
                { type: "uint256", name: "timestamp", indexed: false },
                { type: "address", name: "owner", indexed: false },
            ],
        },
        onLogs: async (logs) => {
            for (const log of logs) {
                try {
                    const event: AllowedStablecoinEvent = {
                        tokenAddress: log.args.tokenAddress as Address,
                        timestamp: log.args.timestamp as bigint,
                        owner: log.args.owner as Address,
                        blockNumber: log.blockNumber,
                        transactionHash: log.transactionHash,
                        logIndex: log.logIndex,
                    };
                    await onAllowed(event);
                } catch (error) {
                    logger.error("Error processing AllowedStablecoin event:", error);
                    onError?.(error as Error);
                }
            }
        },
        onError: (error) => {
            logger.error("Error watching AllowedStablecoin events:", error);
            onError?.(error);
        },
    });
};

// Fetch historical Deposited events
export const getHistoricalDepositedEvents = async (
    fromBlock: bigint,
    toBlock?: bigint
): Promise<DepositedEvent[]> => {
    const client = getPublicClient();
    const vaultAddress = getVaultAddress();

    const logs = await client.getLogs({
        address: vaultAddress,
        event: {
            type: "event",
            name: "Deposited",
            inputs: [
                { type: "address", name: "tokenAddress", indexed: true },
                { type: "address", name: "user", indexed: true },
                { type: "uint256", name: "amount", indexed: false },
                { type: "bytes32", name: "refId", indexed: true },
            ],
        },
        fromBlock,
        toBlock: toBlock ?? "latest",
    });

    return logs.map((log) => ({
        tokenAddress: log.args.tokenAddress as Address,
        user: log.args.user as Address,
        amount: log.args.amount as bigint,
        refId: log.args.refId as Address,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
    }));
};

// Fetch historical AllowedStablecoin events
export const getHistoricalAllowedStablecoinEvents = async (
    fromBlock: bigint,
    toBlock?: bigint
): Promise<AllowedStablecoinEvent[]> => {
    const client = getPublicClient();
    const vaultAddress = getVaultAddress();

    const logs = await client.getLogs({
        address: vaultAddress,
        event: {
            type: "event",
            name: "AllowedStablecoin",
            inputs: [
                { type: "address", name: "tokenAddress", indexed: true },
                { type: "uint256", name: "timestamp", indexed: false },
                { type: "address", name: "owner", indexed: false },
            ],
        },
        fromBlock,
        toBlock: toBlock ?? "latest",
    });

    return logs.map((log) => ({
        tokenAddress: log.args.tokenAddress as Address,
        timestamp: log.args.timestamp as bigint,
        owner: log.args.owner as Address,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
    }));
};

// Combined watcher for all vault events
export const createVaultEventWatcher = (handlers: {
    onDeposited: DepositedEventHandler;
    onAllowedStablecoin?: AllowedStablecoinEventHandler;
    onError?: (error: Error) => void;
}): { unwatch: () => void } => {
    const unwatchDeposited = watchDepositedEvents(handlers.onDeposited, handlers.onError);

    const unwatchAllowed = handlers.onAllowedStablecoin
        ? watchAllowedStablecoinEvents(handlers.onAllowedStablecoin, handlers.onError)
        : null;

    return {
        unwatch: () => {
            unwatchDeposited();
            unwatchAllowed?.();
            logger.info("Stopped watching vault events");
        },
    };
};

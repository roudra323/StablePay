/**
 * Unit Tests for Vault Listener
 * 
 * These tests mock viem to test the parsing and transformation logic
 * without needing a real blockchain connection.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Address } from 'viem';

// Mock dependencies before importing the module under test
vi.mock('./provider.js', () => ({
    getPublicClient: vi.fn(),
}));

vi.mock('../contracts.js', () => ({
    STABLECOIN_VAULT_ADDRESS: {
        11155111: '0x1234567890123456789012345678901234567890' as Address,
        31337: '0x0987654321098765432109876543210987654321' as Address,
    },
}));

vi.mock('../../config/blockchain.js', () => ({
    blockchainConfig: {
        chainId: 11155111,
        rpcUrl: 'https://rpc.sepolia.org',
        pollingInterval: 4000,
        confirmations: 2,
    },
}));

vi.mock('../../utils/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('Vault Listener Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    describe('getHistoricalDepositedEvents', () => {
        it('should correctly parse and transform deposit event logs', async () => {
            const mockLogs = [
                {
                    args: {
                        tokenAddress: '0xTokenAddress123456789012345678901234' as Address,
                        user: '0xUserAddress1234567890123456789012345' as Address,
                        amount: 1000000000000000000n, // 1 ETH in wei
                        refId: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                    },
                    blockNumber: 12345n,
                    transactionHash: '0xTxHash12345678901234567890123456789012345678901234567890123456789' as Address,
                    logIndex: 0,
                },
            ];

            const mockGetLogs = vi.fn().mockResolvedValue(mockLogs);
            const mockClient = { getLogs: mockGetLogs };

            const { getPublicClient } = await import('./provider.js');
            (getPublicClient as Mock).mockReturnValue(mockClient);

            const { getHistoricalDepositedEvents } = await import('./vault.listener.js');
            const events = await getHistoricalDepositedEvents(0n, 100n);

            expect(events).toHaveLength(1);
            expect(events[0]).toEqual({
                tokenAddress: '0xTokenAddress123456789012345678901234',
                user: '0xUserAddress1234567890123456789012345',
                amount: 1000000000000000000n,
                refId: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                blockNumber: 12345n,
                transactionHash: '0xTxHash12345678901234567890123456789012345678901234567890123456789',
                logIndex: 0,
            });
        });

        it('should handle empty log array', async () => {
            const mockGetLogs = vi.fn().mockResolvedValue([]);
            const mockClient = { getLogs: mockGetLogs };

            const { getPublicClient } = await import('./provider.js');
            (getPublicClient as Mock).mockReturnValue(mockClient);

            const { getHistoricalDepositedEvents } = await import('./vault.listener.js');
            const events = await getHistoricalDepositedEvents(0n, 100n);

            expect(events).toHaveLength(0);
            expect(events).toEqual([]);
        });

        it('should call getLogs with correct parameters', async () => {
            const mockGetLogs = vi.fn().mockResolvedValue([]);
            const mockClient = { getLogs: mockGetLogs };

            const { getPublicClient } = await import('./provider.js');
            (getPublicClient as Mock).mockReturnValue(mockClient);

            const { getHistoricalDepositedEvents } = await import('./vault.listener.js');
            await getHistoricalDepositedEvents(100n, 200n);

            expect(mockGetLogs).toHaveBeenCalledWith(
                expect.objectContaining({
                    address: '0x1234567890123456789012345678901234567890',
                    fromBlock: 100n,
                    toBlock: 200n,
                })
            );
        });

        it('should use "latest" as toBlock when not specified', async () => {
            const mockGetLogs = vi.fn().mockResolvedValue([]);
            const mockClient = { getLogs: mockGetLogs };

            const { getPublicClient } = await import('./provider.js');
            (getPublicClient as Mock).mockReturnValue(mockClient);

            const { getHistoricalDepositedEvents } = await import('./vault.listener.js');
            await getHistoricalDepositedEvents(100n);

            expect(mockGetLogs).toHaveBeenCalledWith(
                expect.objectContaining({
                    fromBlock: 100n,
                    toBlock: 'latest',
                })
            );
        });

        it('should handle multiple events', async () => {
            const mockLogs = [
                {
                    args: {
                        tokenAddress: '0xToken1' as Address,
                        user: '0xUser1' as Address,
                        amount: 100n,
                        refId: '0xRef1',
                    },
                    blockNumber: 1n,
                    transactionHash: '0xHash1' as Address,
                    logIndex: 0,
                },
                {
                    args: {
                        tokenAddress: '0xToken2' as Address,
                        user: '0xUser2' as Address,
                        amount: 200n,
                        refId: '0xRef2',
                    },
                    blockNumber: 2n,
                    transactionHash: '0xHash2' as Address,
                    logIndex: 1,
                },
            ];

            const mockGetLogs = vi.fn().mockResolvedValue(mockLogs);
            const mockClient = { getLogs: mockGetLogs };

            const { getPublicClient } = await import('./provider.js');
            (getPublicClient as Mock).mockReturnValue(mockClient);

            const { getHistoricalDepositedEvents } = await import('./vault.listener.js');
            const events = await getHistoricalDepositedEvents(0n);

            expect(events).toHaveLength(2);
            expect(events[0].amount).toBe(100n);
            expect(events[1].amount).toBe(200n);
        });
    });

    describe('getHistoricalAllowedStablecoinEvents', () => {
        it('should correctly parse AllowedStablecoin events', async () => {
            const mockLogs = [
                {
                    args: {
                        tokenAddress: '0xStablecoin123' as Address,
                        timestamp: 1704067200n, // Jan 1, 2024
                        owner: '0xOwnerAddress' as Address,
                    },
                    blockNumber: 99999n,
                    transactionHash: '0xAllowTxHash' as Address,
                    logIndex: 5,
                },
            ];

            const mockGetLogs = vi.fn().mockResolvedValue(mockLogs);
            const mockClient = { getLogs: mockGetLogs };

            const { getPublicClient } = await import('./provider.js');
            (getPublicClient as Mock).mockReturnValue(mockClient);

            const { getHistoricalAllowedStablecoinEvents } = await import('./vault.listener.js');
            const events = await getHistoricalAllowedStablecoinEvents(0n);

            expect(events).toHaveLength(1);
            expect(events[0]).toEqual({
                tokenAddress: '0xStablecoin123',
                timestamp: 1704067200n,
                owner: '0xOwnerAddress',
                blockNumber: 99999n,
                transactionHash: '0xAllowTxHash',
                logIndex: 5,
            });
        });
    });

    describe('vault address resolution', () => {
        it('should throw error for unconfigured chain ID', async () => {
            vi.doMock('../../config/blockchain.js', () => ({
                blockchainConfig: {
                    chainId: 99999, // Unknown chain
                    rpcUrl: 'https://unknown.rpc',
                },
            }));

            const mockGetLogs = vi.fn();
            const mockClient = { getLogs: mockGetLogs };

            const { getPublicClient } = await import('./provider.js');
            (getPublicClient as Mock).mockReturnValue(mockClient);

            // Need to re-import after changing the mock
            const vaultListener = await import('./vault.listener.js');

            await expect(
                vaultListener.getHistoricalDepositedEvents(0n)
            ).rejects.toThrow('No vault address configured for chain 99999');
        });
    });
});


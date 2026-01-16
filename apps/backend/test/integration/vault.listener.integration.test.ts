/**
 * Vault Listener Integration Tests
 * 
 * Prerequisites:
 * 1. Start Anvil: anvil
 * 2. Deploy contracts: 
 *    cd contracts && forge script script/mocks/DeployStablecoin.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
 *    cd contracts && forge script script/DeployStablecoinVault.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
 * 3. Update contract addresses in test/setup/contracts.ts if needed
 * 4. Run tests: pnpm test:integration
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { parseUnits, keccak256, toBytes, type Hex, type Address } from 'viem';
import {
  TEST_ACCOUNTS,
  createAnvilWalletClient,
  createAnvilPublicClient,
} from '../setup/anvil.js';
import {
  TEST_VAULT_ADDRESS,
  TEST_STABLECOIN_ADDRESS,
  ERC20_ABI,
  DEPOSITED_EVENT,
  ALLOWED_STABLECOIN_EVENT,
} from '../setup/contracts.js';
import { STABLECOIN_VAULT_ABI } from '../../src/blockchain/contracts.js';

describe('Vault Listener Integration Tests', () => {
  // Create fresh clients for each test run
  const publicClient = createAnvilPublicClient();

  const deployerWallet = createAnvilWalletClient(TEST_ACCOUNTS.deployer);
  const user1Wallet = createAnvilWalletClient(TEST_ACCOUNTS.user1);
  const user2Wallet = createAnvilWalletClient(TEST_ACCOUNTS.user2);

  // Shared helper - mint tokens and approve vault
  const setupUserForDeposit = async (
    userWallet: ReturnType<typeof createAnvilWalletClient>,
    rawAmount: bigint
  ) => {
    const scaledAmount = parseUnits(rawAmount.toString(), 18);

    // Mint tokens to user
    const mintHash = await deployerWallet.writeContract({
      address: TEST_STABLECOIN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'mint',
      args: [userWallet.account.address, rawAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: mintHash });

    // Approve vault
    const approveHash = await userWallet.writeContract({
      address: TEST_STABLECOIN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [TEST_VAULT_ADDRESS, scaledAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    return scaledAmount;
  };

  // Allow the stablecoin in the vault once before all tests
  beforeAll(async () => {
    const hash = await deployerWallet.writeContract({
      address: TEST_VAULT_ADDRESS,
      abi: STABLECOIN_VAULT_ABI,
      functionName: 'allowStablecoin',
      args: [TEST_STABLECOIN_ADDRESS],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  });

  describe('Contract Setup Verification', () => {
    it('should connect to Anvil and get block number', async () => {
      const blockNumber = await publicClient.getBlockNumber();
      expect(blockNumber).toBeGreaterThanOrEqual(0n);
    });

    it('should have deployed vault contract', async () => {
      const code = await publicClient.getCode({ address: TEST_VAULT_ADDRESS });
      expect(code).toBeDefined();
      expect(code?.length).toBeGreaterThan(2);
    });

    it('should have deployed stablecoin contract', async () => {
      const code = await publicClient.getCode({ address: TEST_STABLECOIN_ADDRESS });
      expect(code).toBeDefined();
      expect(code?.length).toBeGreaterThan(2);
    });
  });

  describe('AllowedStablecoin Events', () => {
    it('should emit AllowedStablecoin event when owner allows a token', async () => {
      const newTokenAddress = '0x1234567890123456789012345678901234567890' as Address;

      const hash = await deployerWallet.writeContract({
        address: TEST_VAULT_ADDRESS,
        abi: STABLECOIN_VAULT_ABI,
        functionName: 'allowStablecoin',
        args: [newTokenAddress],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).toBe('success');

      const logs = await publicClient.getLogs({
        address: TEST_VAULT_ADDRESS,
        event: ALLOWED_STABLECOIN_EVENT,
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].args.tokenAddress?.toLowerCase()).toBe(newTokenAddress.toLowerCase());
      expect(logs[0].args.owner?.toLowerCase()).toBe(TEST_ACCOUNTS.deployer.address.toLowerCase());
    });
  });

  describe('Deposited Events', () => {
    it('should emit Deposited event when user deposits tokens', async () => {
      const depositAmount = await setupUserForDeposit(user1Wallet, 100n);
      const refId = keccak256(toBytes(`deposit-${Date.now()}`));

      const depositHash = await user1Wallet.writeContract({
        address: TEST_VAULT_ADDRESS,
        abi: STABLECOIN_VAULT_ABI,
        functionName: 'deposit',
        args: [TEST_STABLECOIN_ADDRESS, depositAmount, refId],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
      expect(receipt.status).toBe('success');

      const logs = await publicClient.getLogs({
        address: TEST_VAULT_ADDRESS,
        event: DEPOSITED_EVENT,
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].args.tokenAddress?.toLowerCase()).toBe(TEST_STABLECOIN_ADDRESS.toLowerCase());
      expect(logs[0].args.user?.toLowerCase()).toBe(TEST_ACCOUNTS.user1.address.toLowerCase());
      expect(logs[0].args.amount).toBe(depositAmount);
      expect(logs[0].args.refId).toBe(refId);
    });

    it('should track multiple deposits from different users', async () => {
      const refId1 = keccak256(toBytes(`multi-1-${Date.now()}`));
      const refId2 = keccak256(toBytes(`multi-2-${Date.now()}`));

      const amount1 = await setupUserForDeposit(user1Wallet, 50n);
      const amount2 = await setupUserForDeposit(user2Wallet, 75n);

      const hash1 = await user1Wallet.writeContract({
        address: TEST_VAULT_ADDRESS,
        abi: STABLECOIN_VAULT_ABI,
        functionName: 'deposit',
        args: [TEST_STABLECOIN_ADDRESS, amount1, refId1],
      });
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const hash2 = await user2Wallet.writeContract({
        address: TEST_VAULT_ADDRESS,
        abi: STABLECOIN_VAULT_ABI,
        functionName: 'deposit',
        args: [TEST_STABLECOIN_ADDRESS, amount2, refId2],
      });
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const logs = await publicClient.getLogs({
        address: TEST_VAULT_ADDRESS,
        event: DEPOSITED_EVENT,
        fromBlock: 0n,
        toBlock: 'latest',
      });

      const user1Deposit = logs.find((log) => log.args.refId === refId1);
      const user2Deposit = logs.find((log) => log.args.refId === refId2);

      expect(user1Deposit).toBeDefined();
      expect(user1Deposit?.args.amount).toBe(amount1);

      expect(user2Deposit).toBeDefined();
      expect(user2Deposit?.args.amount).toBe(amount2);
    });

    it('should reject duplicate reference IDs', async () => {
      const refId = keccak256(toBytes(`dup-${Date.now()}`));
      const depositAmount = await setupUserForDeposit(user1Wallet, 50n);
      const halfAmount = depositAmount / 2n;

      const hash1 = await user1Wallet.writeContract({
        address: TEST_VAULT_ADDRESS,
        abi: STABLECOIN_VAULT_ABI,
        functionName: 'deposit',
        args: [TEST_STABLECOIN_ADDRESS, halfAmount, refId],
      });
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      await expect(
        user1Wallet.writeContract({
          address: TEST_VAULT_ADDRESS,
          abi: STABLECOIN_VAULT_ABI,
          functionName: 'deposit',
          args: [TEST_STABLECOIN_ADDRESS, halfAmount, refId],
        })
      ).rejects.toThrow();
    });
  });

  describe('Historical Event Fetching', () => {
    it('should fetch historical events from a range of blocks', async () => {
      const refIds: Hex[] = [];
      const receipts: { blockNumber: bigint }[] = [];

      // Make 3 deposits and track their blocks
      for (let i = 0; i < 3; i++) {
        const refId = keccak256(toBytes(`hist-${Date.now()}-${i}`));
        refIds.push(refId);

        const depositAmount = await setupUserForDeposit(user1Wallet, 10n);

        const hash = await user1Wallet.writeContract({
          address: TEST_VAULT_ADDRESS,
          abi: STABLECOIN_VAULT_ABI,
          functionName: 'deposit',
          args: [TEST_STABLECOIN_ADDRESS, depositAmount, refId],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        receipts.push({ blockNumber: receipt.blockNumber });
      }

      // Get the block range from receipts
      const minBlock = receipts.reduce((min, r) => r.blockNumber < min ? r.blockNumber : min, receipts[0].blockNumber);
      const maxBlock = receipts.reduce((max, r) => r.blockNumber > max ? r.blockNumber : max, receipts[0].blockNumber);

      const logs = await publicClient.getLogs({
        address: TEST_VAULT_ADDRESS,
        event: DEPOSITED_EVENT,
        fromBlock: minBlock,
        toBlock: maxBlock,
      });

      // Find our specific deposits
      const ourDeposits = logs.filter((log) =>
        refIds.includes(log.args.refId as Hex)
      );

      expect(ourDeposits.length).toBe(3);

      for (const log of ourDeposits) {
        expect(log.args.tokenAddress).toBeDefined();
        expect(log.args.user).toBeDefined();
        expect(log.args.amount).toBeDefined();
        expect(log.blockNumber).toBeGreaterThan(0n);
        expect(log.transactionHash).toBeDefined();
      }
    });
  });

  describe('Block Confirmation Handling', () => {
    it('should include block metadata in event logs', async () => {
      const refId = keccak256(toBytes(`meta-${Date.now()}`));
      const depositAmount = await setupUserForDeposit(user1Wallet, 50n);

      const hash = await user1Wallet.writeContract({
        address: TEST_VAULT_ADDRESS,
        abi: STABLECOIN_VAULT_ABI,
        functionName: 'deposit',
        args: [TEST_STABLECOIN_ADDRESS, depositAmount, refId],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Fetch the event
      const logs = await publicClient.getLogs({
        address: TEST_VAULT_ADDRESS,
        event: DEPOSITED_EVENT,
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });

      expect(logs).toHaveLength(1);

      // Verify block metadata is present for confirmation tracking
      const event = logs[0];
      expect(event.blockNumber).toBe(receipt.blockNumber);
      expect(event.transactionHash).toBe(hash);
      expect(event.logIndex).toBeGreaterThanOrEqual(0);
      expect(event.blockHash).toBeDefined();
    });

    it('should allow fetching events within specific block ranges', async () => {
      const refId = keccak256(toBytes(`range-${Date.now()}`));
      const depositAmount = await setupUserForDeposit(user1Wallet, 30n);

      const hash = await user1Wallet.writeContract({
        address: TEST_VAULT_ADDRESS,
        abi: STABLECOIN_VAULT_ABI,
        functionName: 'deposit',
        args: [TEST_STABLECOIN_ADDRESS, depositAmount, refId],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const depositBlock = receipt.blockNumber;

      // Fetch events from block 0 to deposit block
      const logs = await publicClient.getLogs({
        address: TEST_VAULT_ADDRESS,
        event: DEPOSITED_EVENT,
        fromBlock: 0n,
        toBlock: depositBlock,
      });

      // Our deposit should be in the logs
      const ourDeposit = logs.find((log) => log.args.refId === refId);
      expect(ourDeposit).toBeDefined();
      expect(ourDeposit?.blockNumber).toBe(depositBlock);

      // Fetch events AFTER deposit block (should not include our deposit)
      const laterLogs = await publicClient.getLogs({
        address: TEST_VAULT_ADDRESS,
        event: DEPOSITED_EVENT,
        fromBlock: depositBlock + 1n,
        toBlock: 'latest',
      });

      const notOurDeposit = laterLogs.find((log) => log.args.refId === refId);
      expect(notOurDeposit).toBeUndefined();
    });
  });
});

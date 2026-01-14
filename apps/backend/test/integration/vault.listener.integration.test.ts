/**
 * Vault Listener Integration Tests
 * 
 * Prerequisites:
 * 1. Start Anvil: anvil
 * 2. Deploy contracts: cd contracts && forge script script/DeployStablecoinVault.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
 * 3. Update contract addresses in test/setup/contracts.ts if needed
 * 4. Run tests: pnpm test:integration
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { parseEther, keccak256, toBytes, type Hex, type Address } from 'viem';
import {
  TEST_ACCOUNTS,
  createAnvilWalletClient,
  getPublicClient,
  getTestClient,
  snapshot,
  revert,
  mineBlocks,
  mineBlock,
  getBlockNumber,
  waitForTransaction,
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
  let snapshotId: Hex;
  
  const publicClient = getPublicClient();
  const testClient = getTestClient();
  
  const deployerWallet = createAnvilWalletClient(TEST_ACCOUNTS.deployer);
  const user1Wallet = createAnvilWalletClient(TEST_ACCOUNTS.user1);
  const user2Wallet = createAnvilWalletClient(TEST_ACCOUNTS.user2);

  // Take a snapshot before each test for isolation
  beforeEach(async () => {
    snapshotId = await snapshot();
  });

  // Revert to snapshot after each test
  afterEach(async () => {
    await revert(snapshotId);
  });

  describe('Contract Setup Verification', () => {
    it('should connect to Anvil and get block number', async () => {
      const blockNumber = await getBlockNumber();
      expect(blockNumber).toBeGreaterThanOrEqual(0n);
    });

    it('should have deployed vault contract', async () => {
      const code = await publicClient.getCode({ address: TEST_VAULT_ADDRESS });
      expect(code).toBeDefined();
      expect(code?.length).toBeGreaterThan(2); // More than just '0x'
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

      const receipt = await waitForTransaction(hash);
      expect(receipt.status).toBe('success');

      // Fetch the AllowedStablecoin event
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
    // Helper to mint tokens and approve vault
    const setupUserForDeposit = async (
      userWallet: ReturnType<typeof createAnvilWalletClient>,
      amount: bigint
    ) => {
      // Mint tokens to user (assuming deployer can mint)
      const mintHash = await deployerWallet.writeContract({
        address: TEST_STABLECOIN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'mint',
        args: [userWallet.account.address, amount],
      });
      await waitForTransaction(mintHash);

      // Approve vault to spend tokens
      const approveHash = await userWallet.writeContract({
        address: TEST_STABLECOIN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TEST_VAULT_ADDRESS, amount],
      });
      await waitForTransaction(approveHash);
    };

    it('should emit Deposited event when user deposits tokens', async () => {
      const depositAmount = parseEther('100');
      const refId = keccak256(toBytes('test-deposit-001'));

      await setupUserForDeposit(user1Wallet, depositAmount);

      // Deposit tokens
      const depositHash = await user1Wallet.writeContract({
        address: TEST_VAULT_ADDRESS,
        abi: STABLECOIN_VAULT_ABI,
        functionName: 'deposit',
        args: [TEST_STABLECOIN_ADDRESS, depositAmount, refId],
      });

      const receipt = await waitForTransaction(depositHash);
      expect(receipt.status).toBe('success');

      // Fetch the Deposited event
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
      const amount1 = parseEther('50');
      const amount2 = parseEther('75');
      const refId1 = keccak256(toBytes('multi-deposit-001'));
      const refId2 = keccak256(toBytes('multi-deposit-002'));

      // Setup both users
      await setupUserForDeposit(user1Wallet, amount1);
      await setupUserForDeposit(user2Wallet, amount2);

      // User 1 deposits
      const hash1 = await user1Wallet.writeContract({
        address: TEST_VAULT_ADDRESS,
        abi: STABLECOIN_VAULT_ABI,
        functionName: 'deposit',
        args: [TEST_STABLECOIN_ADDRESS, amount1, refId1],
      });
      await waitForTransaction(hash1);

      // User 2 deposits
      const hash2 = await user2Wallet.writeContract({
        address: TEST_VAULT_ADDRESS,
        abi: STABLECOIN_VAULT_ABI,
        functionName: 'deposit',
        args: [TEST_STABLECOIN_ADDRESS, amount2, refId2],
      });
      await waitForTransaction(hash2);

      // Fetch all Deposited events
      const logs = await publicClient.getLogs({
        address: TEST_VAULT_ADDRESS,
        event: DEPOSITED_EVENT,
        fromBlock: 0n,
        toBlock: 'latest',
      });

      // Should have at least 2 deposits
      expect(logs.length).toBeGreaterThanOrEqual(2);

      // Find our specific deposits
      const user1Deposit = logs.find(
        (log) => log.args.refId === refId1
      );
      const user2Deposit = logs.find(
        (log) => log.args.refId === refId2
      );

      expect(user1Deposit).toBeDefined();
      expect(user1Deposit?.args.user?.toLowerCase()).toBe(TEST_ACCOUNTS.user1.address.toLowerCase());
      expect(user1Deposit?.args.amount).toBe(amount1);

      expect(user2Deposit).toBeDefined();
      expect(user2Deposit?.args.user?.toLowerCase()).toBe(TEST_ACCOUNTS.user2.address.toLowerCase());
      expect(user2Deposit?.args.amount).toBe(amount2);
    });

    it('should reject duplicate reference IDs', async () => {
      const depositAmount = parseEther('25');
      const refId = keccak256(toBytes('duplicate-test'));

      await setupUserForDeposit(user1Wallet, depositAmount * 2n);

      // First deposit should succeed
      const hash1 = await user1Wallet.writeContract({
        address: TEST_VAULT_ADDRESS,
        abi: STABLECOIN_VAULT_ABI,
        functionName: 'deposit',
        args: [TEST_STABLECOIN_ADDRESS, depositAmount, refId],
      });
      await waitForTransaction(hash1);

      // Second deposit with same refId should fail
      await expect(
        user1Wallet.writeContract({
          address: TEST_VAULT_ADDRESS,
          abi: STABLECOIN_VAULT_ABI,
          functionName: 'deposit',
          args: [TEST_STABLECOIN_ADDRESS, depositAmount, refId],
        })
      ).rejects.toThrow();
    });
  });

  describe('Historical Event Fetching', () => {
    it('should fetch historical events from a range of blocks', async () => {
      const depositAmount = parseEther('10');
      
      // Record starting block
      const startBlock = await getBlockNumber();

      // Make multiple deposits
      for (let i = 0; i < 3; i++) {
        const refId = keccak256(toBytes(`historical-${i}`));
        await setupUserForDeposit(user1Wallet, depositAmount);
        
        const hash = await user1Wallet.writeContract({
          address: TEST_VAULT_ADDRESS,
          abi: STABLECOIN_VAULT_ABI,
          functionName: 'deposit',
          args: [TEST_STABLECOIN_ADDRESS, depositAmount, refId],
        });
        await waitForTransaction(hash);
      }

      // Mine some extra blocks
      await mineBlocks(5);

      const endBlock = await getBlockNumber();

      // Fetch events from the range
      const logs = await publicClient.getLogs({
        address: TEST_VAULT_ADDRESS,
        event: DEPOSITED_EVENT,
        fromBlock: startBlock,
        toBlock: endBlock,
      });

      expect(logs.length).toBeGreaterThanOrEqual(3);
      
      // Verify all events have correct structure
      for (const log of logs) {
        expect(log.args.tokenAddress).toBeDefined();
        expect(log.args.user).toBeDefined();
        expect(log.args.amount).toBeDefined();
        expect(log.args.refId).toBeDefined();
        expect(log.blockNumber).toBeGreaterThan(0n);
        expect(log.transactionHash).toBeDefined();
      }
    });
  });

  describe('Block Confirmation Handling', () => {
    it('should correctly track confirmations after mining blocks', async () => {
      const depositAmount = parseEther('50');
      const refId = keccak256(toBytes('confirmation-test'));

      await setupUserForDeposit(user1Wallet, depositAmount);

      const blockBeforeDeposit = await getBlockNumber();

      // Make deposit
      const hash = await user1Wallet.writeContract({
        address: TEST_VAULT_ADDRESS,
        abi: STABLECOIN_VAULT_ABI,
        functionName: 'deposit',
        args: [TEST_STABLECOIN_ADDRESS, depositAmount, refId],
      });
      const receipt = await waitForTransaction(hash);
      
      const depositBlock = receipt.blockNumber;
      expect(depositBlock).toBeGreaterThan(blockBeforeDeposit);

      // Mine 12 more blocks (typical confirmation count)
      await mineBlocks(12);

      const currentBlock = await getBlockNumber();
      const confirmations = currentBlock - depositBlock;

      expect(confirmations).toBe(12n);
    });

    it('should be able to fetch events at specific confirmation depths', async () => {
      const depositAmount = parseEther('30');
      const refId = keccak256(toBytes('depth-test'));

      await setupUserForDeposit(user1Wallet, depositAmount);

      const hash = await user1Wallet.writeContract({
        address: TEST_VAULT_ADDRESS,
        abi: STABLECOIN_VAULT_ABI,
        functionName: 'deposit',
        args: [TEST_STABLECOIN_ADDRESS, depositAmount, refId],
      });
      const receipt = await waitForTransaction(hash);

      // Mine blocks to simulate time passing
      await mineBlocks(20);

      const latestBlock = await getBlockNumber();
      const requiredConfirmations = 6n;
      const safeBlock = latestBlock - requiredConfirmations;

      // Only fetch events that have enough confirmations
      const confirmedLogs = await publicClient.getLogs({
        address: TEST_VAULT_ADDRESS,
        event: DEPOSITED_EVENT,
        fromBlock: 0n,
        toBlock: safeBlock,
      });

      // Our deposit should be in the confirmed logs
      const ourDeposit = confirmedLogs.find((log) => log.args.refId === refId);
      expect(ourDeposit).toBeDefined();
      expect(ourDeposit?.blockNumber).toBeLessThanOrEqual(safeBlock);
    });
  });
});


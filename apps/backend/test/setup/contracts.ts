/**
 * Contract Addresses and ABIs for Testing
 * 
 * Update these addresses after deploying contracts to Anvil:
 * forge script script/DeployStablecoinVault.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
 */
import type { Abi, Address } from 'viem';

// Anvil deployment addresses (from forge script output)
// Stablecoin deployed first, Vault deployed second
export const TEST_STABLECOIN_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address;
export const TEST_VAULT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address;

// Minimal ERC20 ABI for testing
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'mint',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

// Vault event definitions for testing
export const DEPOSITED_EVENT = {
  type: 'event',
  name: 'Deposited',
  inputs: [
    { type: 'address', name: 'tokenAddress', indexed: true },
    { type: 'address', name: 'user', indexed: true },
    { type: 'uint256', name: 'amount', indexed: false },
    { type: 'bytes32', name: 'refId', indexed: true },
  ],
} as const;

export const ALLOWED_STABLECOIN_EVENT = {
  type: 'event',
  name: 'AllowedStablecoin',
  inputs: [
    { type: 'address', name: 'tokenAddress', indexed: true },
    { type: 'uint256', name: 'timestamp', indexed: false },
    { type: 'address', name: 'owner', indexed: false },
  ],
} as const;


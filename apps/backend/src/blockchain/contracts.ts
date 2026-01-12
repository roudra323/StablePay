// Vault ABI and contract address
import StablecoinVaultABI from "../../../../contracts/out/StableCoinVault.sol/StabelCoinVault.json" with { type: "json" };
import { type Abi, type Address } from "viem";


export const STABLECOIN_VAULT_ABI = StablecoinVaultABI.abi as Abi;


export const STABLECOIN_VAULT_ADDRESS: Record<number, Address> = {
    11155111: "0xYourSepoliaContractAddressHere", // Sepolia Testnet
    31337: "0xYourHardhatContractAddressHere", // Hardhat Local Network
}

import { networks } from "bitcoinjs-lib";

import { Network, WalletProvider } from "./wallet_provider";
import { OKXWallet } from "./okx_wallet";
import { walletClasses } from "./list";

const nativeSegwitAddressLength = 42;
const taprootAddressLength = 62;

// Get the wallet provider from the window object, default to OKXWallet if not found.
export const getWallet = (): WalletProvider => {
  // Check for other wallets in the window object
  for (const key in walletClasses) {
    if (window[key as keyof typeof window]) {
      const WalletClass = walletClasses[key];
      return new WalletClass();
    }
  }

  // Inject the wallet provider into the window object
  if (window.btcwallet) {
    return window.btcwallet;
  }

  // Default to OKXWallet if no other wallet is found
  return new OKXWallet();
};

export const toNetwork = (network: Network): networks.Network => {
  switch (network) {
    case "mainnet":
      return networks.bitcoin;
    case "testnet":
    case "signet":
      return networks.testnet;
    case "regtest":
      return networks.regtest;
    default:
      throw new Error("Unsupported network");
  }
};

export const isSupportedAddressType = (address: string): boolean => {
  return (
    address.length === nativeSegwitAddressLength ||
    address.length === taprootAddressLength
  );
};

export const isTaproot = (address: string): boolean => {
  return address.length === taprootAddressLength;
};

export const getPublicKeyNoCoord = (pkHex: string): Buffer => {
  const publicKey = Buffer.from(pkHex, "hex");
  return publicKey.subarray(1, 33);
};

import { WalletProvider } from "./wallet_provider";
import { OKXWallet } from "./okx_wallet";
import { TomoWallet } from "./tomo_wallet";
import { OneKeyWallet } from "./onekey_wallet";
import { BitgetWallet } from "./bitget_wallet";
import okxIcon from "./icons/okx.svg";
import tomoIcon from "./icons/tomo.svg";
import oneKeyIcon from "./icons/onekey.svg";
import bitGetIcon from "./icons/bitget.svg";

interface WalletInfo {
  wallet: new () => WalletProvider;
  name: string;
  icon: string;
}

export const walletsList: Record<string, WalletInfo> = {
  OKX: {
    wallet: OKXWallet,
    name: "OKX Wallet",
    icon: okxIcon,
  },
  TOMO: {
    wallet: TomoWallet,
    name: "Tomo",
    icon: tomoIcon,
  },
  ONEKEY: {
    wallet: OneKeyWallet,
    name: "OneKey",
    icon: oneKeyIcon,
  },
  BITGET: {
    wallet: BitgetWallet,
    name: "Bitget",
    icon: bitGetIcon,
  },
};

export const walletsListArray = Object.keys(walletsList).map((key) => {
  return {
    key,
    ...walletsList[key],
  };
});

// window object keys
enum WalletType {
  OKX = "okxwallet",
  Tomo = "tomo_btc",
  OneKey = "$onekey",
  Bitget = "bitkeep",
}

// Create a mapping of wallet type identifiers to their respective classes
export const walletClasses: Record<string, new () => WalletProvider> = {
  [WalletType.OKX]: OKXWallet,
  [WalletType.Tomo]: TomoWallet,
  [WalletType.OneKey]: OneKeyWallet,
  [WalletType.Bitget]: BitgetWallet,
  // Add more wallet class mappings as needed
};

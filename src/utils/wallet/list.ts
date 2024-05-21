import { WalletProvider } from "./wallet_provider";
import { OKXWallet } from "./okx_wallet";
import { TomoWallet } from "./tomo_wallet";
import { OneKeyWallet } from "./onekey_wallet";

import okxIcon from "./icons/okx.svg";
import tomoIcon from "./icons/tomo.svg";
import oneKeyIcon from "./icons/onekey.svg";

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
  OneKey = "$onekey.btcwallet",
}

// Create a mapping of wallet type identifiers to their respective classes
export const walletClasses: Record<string, new () => WalletProvider> = {
  [WalletType.OKX]: OKXWallet,
  [WalletType.Tomo]: TomoWallet,
  [WalletType.OneKey]: OneKeyWallet,
  // Add more wallet class mappings as needed
};

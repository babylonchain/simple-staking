import { WalletProvider } from "./wallet_provider";
import { OKXWallet } from "./okx_wallet";
import { TomoWallet } from "./tomo_wallet";

import okxIcon from "./icons/okx.svg";
import tomoIcon from "./icons/tomo.svg";

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
};

export const walletsListArray = Object.keys(walletsList).map((key) => {
  return {
    key,
    ...walletsList[key],
  };
});

enum WalletType {
  OKX = "okx",
  Tomo = "tomo",
}

// Create a mapping of wallet type identifiers to their respective classes
export const walletClasses: Record<string, new () => WalletProvider> = {
  [WalletType.OKX]: OKXWallet,
  [WalletType.Tomo]: TomoWallet,
  // Add more wallet class mappings as needed
};

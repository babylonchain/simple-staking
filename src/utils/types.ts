import { WalletProvider } from "./wallet/wallet_provider";

export {};

declare global {
  interface Window {
    btc: any;
    keplr: any;
    btcwallet: WalletProvider;
    tomo_btc: any;
    okxwallet: any;
    $onekey: any;
  }
}

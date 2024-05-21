import { WalletProvider, Network, Fees, UTXO } from "./wallet_provider";
import {
  getAddressBalance,
  getTipHeight,
  getFundingUTXOs,
  getNetworkFees,
  pushTx,
} from "../mempool_api";

type OneKeyWalletInfo = {
  publicKeyHex: string;
  address: string;
};

export class OneKeyWallet extends WalletProvider {
  private oneKeyWalletInfo: OneKeyWalletInfo | undefined;
  private provider = window.$onekey?.btcwallet;

  constructor() {
    super();
  }

  connectWallet = async (): Promise<this> => {
    // check whether there is an OneKey wallet extension
    if (!this.provider) {
      throw new Error("OneKey wallet extension not found");
    }

    const connect = await this.provider?.connectWallet();
    console.log(connect);
    const address = await this.provider?.getAddress();
    const compressedPublicKey = await this.provider.getPublicKeyHex();

    if (compressedPublicKey && address) {
      this.oneKeyWalletInfo = {
        publicKeyHex: compressedPublicKey,
        address,
      };
      return this;
    } else {
      throw new Error("Could not connect to OneKey wallet");
    }
  };

  getWalletProviderName = async (): Promise<string> => {
    return "OneKey wallet";
  };

  getAddress = async (): Promise<string> => {
    if (!this.oneKeyWalletInfo) {
      throw new Error("OneKey wallet not connected");
    }
    return this.oneKeyWalletInfo.address;
  };

  getPublicKeyHex = async (): Promise<string> => {
    if (!this.oneKeyWalletInfo) {
      throw new Error("OneKey wallet not connected");
    }
    return this.oneKeyWalletInfo.publicKeyHex;
  };

  signPsbt = async (psbtHex: string): Promise<string> => {
    if (!this.oneKeyWalletInfo) {
      throw new Error("OneKey wallet not connected");
    }
    // sign the PSBT
    return await this.provider?.signPsbt(psbtHex);
  };

  signPsbts = async (psbtsHexes: string[]): Promise<string[]> => {
    if (!this.oneKeyWalletInfo) {
      throw new Error("OneKey wallet not connected");
    }
    // sign the PSBTs
    return await this.provider?.signPsbts(psbtsHexes);
  };

  signMessageBIP322 = async (message: string): Promise<string> => {
    if (!this.oneKeyWalletInfo) {
      throw new Error("OneKey wallet not connected");
    }
    return await this.provider?.signMessageBIP322(message);
  };

  getNetwork = async (): Promise<Network> => {
    return "testnet";
  };

  on = (eventName: string, callBack: () => void) => {
    if (!this.oneKeyWalletInfo) {
      throw new Error("OneKey wallet not connected");
    }
    // subscribe to account change event
    if (eventName === "accountChanged") {
      return this.provider?.on(eventName, callBack);
    }
  };

  // Mempool calls

  getBalance = async (): Promise<number> => {
    return await getAddressBalance(await this.getAddress());
  };

  getNetworkFees = async (): Promise<Fees> => {
    return await getNetworkFees();
  };

  pushTx = async (txHex: string): Promise<string> => {
    return await pushTx(txHex);
  };

  getUtxos = async (address: string, amount: number): Promise<UTXO[]> => {
    // mempool call
    return await getFundingUTXOs(address, amount);
  };

  getBTCTipHeight = async (): Promise<number> => {
    return await getTipHeight();
  };
}

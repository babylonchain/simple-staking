import { WalletProvider, Network, Fees, UTXO } from "./wallet_provider";
import {
  getAddressBalance,
  getTipHeight,
  getFundingUTXOs,
  getNetworkFees,
  pushTx,
} from "../mempool_api";

type BitgetWalletInfo = {
  publicKeyHex: string;
  address: string;
};

export class BitgetWallet extends WalletProvider {
  private bitGetWalletInfo: BitgetWalletInfo | undefined;
  private provider = window.bitkeep?.unisat;

  constructor() {
    super();
  }

  connectWallet = async (): Promise<this> => {
    // check whether there is an Bitget wallet extension
    if (!this.provider) {
      throw new Error("Bitget wallet extension not found");
    }

    const accounts = await this.provider?.requestAccounts();

    const address = accounts[0];
    const compressedPublicKey = await this.provider.getPublicKey();

    if (compressedPublicKey && address) {
      this.bitGetWalletInfo = {
        publicKeyHex: compressedPublicKey,
        address,
      };
      return this;
    } else {
      throw new Error("Could not connect to Bitget wallet");
    }
  };

  getWalletProviderName = async (): Promise<string> => {
    return "Bitget wallet";
  };

  getAddress = async (): Promise<string> => {
    if (!this.bitGetWalletInfo) {
      throw new Error("Bitget wallet not connected");
    }
    return this.bitGetWalletInfo.address;
  };

  getPublicKeyHex = async (): Promise<string> => {
    if (!this.bitGetWalletInfo) {
      throw new Error("Bitget wallet not connected");
    }
    return this.bitGetWalletInfo.publicKeyHex;
  };

  signPsbt = async (psbtHex: string): Promise<string> => {
    if (!this.bitGetWalletInfo) {
      throw new Error("Bitget wallet not connected");
    }
    // sign the PSBT
    return await this.provider?.signPsbt(psbtHex);
  };

  signPsbts = async (psbtsHexes: string[]): Promise<string[]> => {
    if (!this.bitGetWalletInfo) {
      throw new Error("Bitget wallet not connected");
    }
    // sign the PSBTs
    return await this.provider?.signPsbts(psbtsHexes);
  };

  signMessageBIP322 = async (message: string): Promise<string> => {
    if (!this.bitGetWalletInfo) {
      throw new Error("Bitget wallet not connected");
    }
    return await this.provider?.signMessageBIP322(message);
  };

  getNetwork = async (): Promise<Network> => {
    return "testnet";
  };

  on = (eventName: string, callBack: () => void) => {
    if (!this.bitGetWalletInfo) {
      throw new Error("Bitget wallet not connected");
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

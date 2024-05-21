import { WalletProvider, Network, Fees, UTXO } from "./wallet_provider";
import {
  getAddressBalance,
  getTipHeight,
  getFundingUTXOs,
  getNetworkFees,
  pushTx,
} from "../mempool_api";

type TomoWalletInfo = {
  publicKeyHex: string;
  address: string;
};

export class TomoWallet extends WalletProvider {
  private tomoWalletInfo: TomoWalletInfo | undefined;

  constructor() {
    super();
  }

  connectWallet = async (): Promise<this> => {
    // check whether there is an Tomo wallet extension
    if (!window.tomo_btc) {
      throw new Error("Tomo wallet extension not found");
    }

    const tomoWallet = window.tomo_btc;
    await window.tomo_btc.initialize();

    const addresses = await tomoWallet.requestAccounts();
    const address = addresses[0];
    const compressedPublicKey = await tomoWallet.getPublicKey();

    if (compressedPublicKey && address) {
      this.tomoWalletInfo = {
        publicKeyHex: compressedPublicKey,
        address,
      };
      return this;
    } else {
      throw new Error("Could not connect to Tomo wallet");
    }
  };

  getWalletProviderName = async (): Promise<string> => {
    return "Tomo wallet";
  };

  getAddress = async (): Promise<string> => {
    if (!this.tomoWalletInfo) {
      throw new Error("Tomo wallet not connected");
    }
    return this.tomoWalletInfo.address;
  };

  getPublicKeyHex = async (): Promise<string> => {
    if (!this.tomoWalletInfo) {
      throw new Error("Tomo wallet not connected");
    }
    return this.tomoWalletInfo.publicKeyHex;
  };

  signPsbt = async (psbtHex: string): Promise<string> => {
    if (!this.tomoWalletInfo) {
      throw new Error("Tomo wallet not connected");
    }
    // sign the PSBT
    return (await this.signPsbts([psbtHex]))[0];
  };

  signPsbts = async (psbtsHexes: string[]): Promise<string[]> => {
    if (!this.tomoWalletInfo) {
      throw new Error("Tomo wallet not connected");
    }
    // sign the PSBTs
    return await window?.tomo_btc?.signPsbts(psbtsHexes);
  };

  signMessageBIP322 = async (message: string): Promise<string> => {
    if (!this.tomoWalletInfo) {
      throw new Error("Tomo wallet not connected");
    }
    return await window?.tomo_btc?.signMessage(message, "bip322-simple");
  };

  getNetwork = async (): Promise<Network> => {
    return "testnet";
  };

  on = (eventName: string, callBack: () => void) => {
    if (!this.tomoWalletInfo) {
      throw new Error("Tomo wallet not connected");
    }
    // subscribe to account change event
    if (eventName === "accountChanged") {
      return window.tomo_btc.on(eventName, callBack);
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

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
    const workingVersion = "2.83.26";
    // check whether there is an Tomo wallet extension
    if (!window.tomo_btc) {
      throw new Error("Tomo wallet extension not found");
    }

    const okxwallet = window.okxwallet;
    try {
      await okxwallet.enable(); // Connect to Tomo wallet extension
    } catch (error) {
      if ((error as Error)?.message?.includes("rejected")) {
        throw new Error("Connection to Tomo wallet was rejected");
      } else {
        throw new Error((error as Error)?.message);
      }
    }
    let result = null;
    try {
      // this will not throw an error even if user has no BTC Signet enabled
      result = await okxwallet?.bitcoinSignet?.connect();
    } catch (error) {
      throw new Error("BTC Signet is not enabled in Tomo wallet");
    }

    const { address, compressedPublicKey } = result;

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
    return await window?.okxwallet?.bitcoinSignet?.signPsbts(psbtsHexes);
  };

  signMessageBIP322 = async (message: string): Promise<string> => {
    if (!this.tomoWalletInfo) {
      throw new Error("Tomo wallet not connected");
    }
    return await window?.okxwallet?.bitcoinSignet?.signMessage(
      message,
      "bip322-simple",
    );
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
      return window.okxwallet.bitcoinSignet.on(eventName, callBack);
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

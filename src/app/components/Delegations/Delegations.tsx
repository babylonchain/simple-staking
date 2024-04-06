import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { Transaction, networks } from "bitcoinjs-lib";
import {
  unbondingTransaction,
  withdrawEarlyUnbondedTransaction,
  withdrawTimelockUnbondedTransaction,
} from "btc-staking-ts";

import { Delegation as DelegationInterface } from "@/app/api/getDelegations";
import { Delegation } from "./Delegation";
import { WalletProvider } from "@/utils/wallet/wallet_provider";
import { GlobalParamsData } from "@/app/api/getGlobalParams";
import { getUnbondingEligibility } from "@/app/api/getUnbondingEligibility";
import { apiDataToStakingScripts } from "@/utils/apiDataToStakingScripts";
import { postUnbonding } from "@/app/api/postUnbonding";
import { toLocalStorageIntermediateDelegation } from "@/utils/local_storage/toLocalStorageIntermediateDelegation";

interface DelegationsProps {
  delegations: DelegationInterface[];
  finalityProvidersKV: Record<string, string>;
  delegationsData: DelegationInterface[];
  btcWallet: WalletProvider;
  globalParamsData: GlobalParamsData;
  publicKeyNoCoord: string;
  unbondingFee: number;
  withdrawalFee: number;
  btcWalletNetwork: networks.Network;
  address: string;
}

export const Delegations: React.FC<DelegationsProps> = ({
  delegations,
  finalityProvidersKV,
  delegationsData,
  btcWallet,
  globalParamsData,
  publicKeyNoCoord,
  unbondingFee,
  withdrawalFee,
  btcWalletNetwork,
  address,
}) => {
  // Local storage state for intermediate delegations (withdrawing, unbonding)
  const intermediateDelegationsLocalStorageKey = address
    ? `bbn-staking-intermediate-delegations-${address}`
    : "";

  const [
    intermediateDelegationsLocalStorage,
    setIntermediateDelegationsLocalStorage,
  ] = useLocalStorage<DelegationInterface[]>(
    intermediateDelegationsLocalStorageKey,
    [],
  );

  const handleUnbond = async (id: string) => {
    if (!delegationsData || !btcWallet || !globalParamsData) return;

    // Find the delegation in the data
    const item = delegationsData?.find(
      (delegation) => delegation?.staking_tx_hash_hex === id,
    );

    if (!item) return;

    // Check if the unbonding is possible
    let unbondingEligibility;
    try {
      unbondingEligibility = await getUnbondingEligibility(
        item.staking_tx_hash_hex,
      );
      if (!unbondingEligibility) {
        throw new Error("Not eligible for unbonding");
      }
    } catch (error: Error | any) {
      console.error(error?.message || "Error checking unbonding eligibility");
      return;
    }

    if (!unbondingEligibility) return;

    // Recreate the staking scripts
    let timelockScript;
    let slashingScript;
    let unbondingScript;
    let unbondingTimelockScript;
    try {
      const data = apiDataToStakingScripts(
        item,
        globalParamsData,
        publicKeyNoCoord,
      );
      if (!data) {
        throw new Error("Error recreating scripts");
      }
      timelockScript = data.timelockScript;
      slashingScript = data.slashingScript;
      unbondingScript = data.unbondingScript;
      unbondingTimelockScript = data.unbondingTimelockScript;
    } catch (error: Error | any) {
      console.error(error?.message || "Cannot build staking scripts");
      return;
    }

    // Create the withdrawal transaction
    let unsignedUnbondingTx;
    try {
      unsignedUnbondingTx = unbondingTransaction(
        unbondingScript,
        unbondingTimelockScript,
        timelockScript,
        slashingScript,
        Transaction.fromHex(item.staking_tx.tx_hex),
        unbondingFee,
        btcWalletNetwork,
        item.staking_tx.output_index,
      );
    } catch (error: Error | any) {
      console.error(error?.message || "Error creating unbonding transaction");
      return;
    }

    // Sign the unbonding transaction
    let unbondingTx: Transaction;
    try {
      unbondingTx = Transaction.fromHex(
        await btcWallet.signPsbt(unsignedUnbondingTx.toHex()),
      );
    } catch (error: Error | any) {
      console.error(error?.message || "Error signing unbonding transaction");
      return;
    }

    let stakerSignature;
    try {
      stakerSignature = unbondingTx.ins[0].witness[0].toString("hex");
    } catch (error: Error | any) {
      console.error(
        error?.message ||
          "Error extracting staked signature from the unbonding transaction",
      );
      return;
    }

    // POST unbonding to the API
    let response;
    try {
      response = await postUnbonding({
        staker_signed_signature_hex: stakerSignature,
        staking_tx_hash_hex: item.staking_tx_hash_hex,
        unbonding_tx_hash_hex: Transaction.fromHex(unbondingTx.toHex()).getId(),
        unbonding_tx_hex: unbondingTx.toHex(),
      });
    } catch (error: Error | any) {
      console.error(error?.message || "Error posting unbonding transaction");
      return;
    }

    // Update the local state with the new delegation
    setIntermediateDelegationsLocalStorage((delegations) => [
      toLocalStorageIntermediateDelegation(
        item.staking_tx_hash_hex,
        publicKeyNoCoord,
        item.finality_provider_pk_hex,
        item.staking_value,
        item.staking_tx.tx_hex,
        item.staking_tx.timelock,
        "intermediate_unbonding",
      ),
      ...delegations,
    ]);
  };

  const handleWithdraw = async (id: string) => {
    if (!delegationsData || !btcWallet) return;

    // Find the delegation in the data
    const item = delegationsData?.find(
      (delegation) => delegation?.staking_tx_hash_hex === id,
    );

    if (!item) return;

    // Recreate the staking scripts
    let timelockScript;
    let slashingScript;
    let unbondingScript;
    let unbondingTimelockScript;
    try {
      const data = apiDataToStakingScripts(
        item,
        globalParamsData,
        publicKeyNoCoord,
      );
      if (!data) {
        throw new Error("Error recreating scripts");
      }
      timelockScript = data.timelockScript;
      slashingScript = data.slashingScript;
      unbondingScript = data.unbondingScript;
      unbondingTimelockScript = data.unbondingTimelockScript;
    } catch (error: Error | any) {
      console.error(error?.message || "Cannot build staking scripts");
      return;
    }

    // Create the withdrawal transaction
    let unsignedWithdrawalTx;
    try {
      if (item?.unbonding_tx) {
        // delegation unbonded manually
        unsignedWithdrawalTx = withdrawEarlyUnbondedTransaction(
          unbondingTimelockScript,
          slashingScript,
          Transaction.fromHex(item.unbonding_tx.tx_hex),
          address,
          withdrawalFee,
          btcWalletNetwork,
          item.staking_tx.output_index,
        );
      } else {
        // delegation unbonded naturally
        unsignedWithdrawalTx = withdrawTimelockUnbondedTransaction(
          timelockScript,
          slashingScript,
          unbondingScript,
          Transaction.fromHex(item.staking_tx.tx_hex),
          address,
          withdrawalFee,
          btcWalletNetwork,
          item.staking_tx.output_index,
        );
      }
    } catch (error: Error | any) {
      console.error(error?.message || "Error creating withdrawal transaction");
      return;
    }

    // Sign withdrawal transaction
    let withdrawalTransaction: Transaction;
    try {
      withdrawalTransaction = Transaction.fromHex(
        await btcWallet.signPsbt(unsignedWithdrawalTx.toHex()),
      );
    } catch (error: Error | any) {
      console.error(error?.message || "Error signing withdrawal transaction");
      return;
    }

    // Broadcast withdrawal transaction
    let txID;
    try {
      txID = await btcWallet.pushTx(withdrawalTransaction.toHex());
    } catch (error: Error | any) {
      console.error(
        error?.message || "Error broadcasting the withdrawal transaction",
      );
      return;
    }

    // Update the local state with the new delegation
    setIntermediateDelegationsLocalStorage((delegations) => [
      toLocalStorageIntermediateDelegation(
        item.staking_tx_hash_hex,
        publicKeyNoCoord,
        item.finality_provider_pk_hex,
        item.staking_value,
        item.staking_tx.tx_hex,
        item.staking_tx.timelock,
        "intermediate_withdrawal",
      ),
      ...delegations,
    ]);
  };

  // Remove the intermediate delegations that are already present in the API
  useEffect(() => {
    if (!delegationsData) {
      return;
    }

    // check if delegationsData has status of unbonded or withdrawn
    // if it does, remove the intermediate delegation from local storage
    setIntermediateDelegationsLocalStorage((intermediateDelegations) =>
      intermediateDelegations?.filter(
        (intermediateDelegation) =>
          !delegationsData?.find(
            (delegation) =>
              delegation?.staking_tx_hash_hex ===
                intermediateDelegation?.staking_tx_hash_hex &&
              (delegation?.state === "unbonding_requested" ||
                delegation?.state === "withdrawn"),
          ),
      ),
    );
  }, [delegationsData, setIntermediateDelegationsLocalStorage]);

  return (
    <div className="card gap-4 bg-base-300 p-4">
      <div className="flex w-full">
        <h2 className="font-bold">Staking history</h2>
      </div>
      <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {delegations?.map((delegation) => {
          if (!delegation) return null;

          const {
            staking_value,
            staking_tx,
            staking_tx_hash_hex,
            finality_provider_pk_hex,
            state,
          } = delegation;
          // Get the moniker of the finality provider
          const finalityProviderMoniker =
            finalityProvidersKV[finality_provider_pk_hex];
          const intermediateDelegation =
            intermediateDelegationsLocalStorage.find(
              (item) => item.staking_tx_hash_hex === staking_tx_hash_hex,
            );

          return (
            <Delegation
              key={staking_tx_hash_hex + staking_tx.start_height}
              finalityProviderMoniker={finalityProviderMoniker}
              stakingTx={staking_tx}
              stakingValue={staking_value}
              stakingTxHash={staking_tx_hash_hex}
              state={state}
              onUnbond={handleUnbond}
              onWithdraw={handleWithdraw}
              intermediateDelegation={intermediateDelegation}
            />
          );
        })}
      </div>
    </div>
  );
};
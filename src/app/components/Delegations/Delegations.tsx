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
import { getIntermediateDelegationsLocalStorageKey } from "@/utils/local_storage/getIntermediateDelegationsLocalStorageKey";
import { State } from "@/utils/getState";

interface DelegationsProps {
  finalityProvidersKV: Record<string, string>;
  delegationsAPI: DelegationInterface[];
  delegationsLocalStorage: DelegationInterface[];
  globalParamsData: GlobalParamsData;
  publicKeyNoCoord: string;
  unbondingFee: number;
  withdrawalFee: number;
  btcWalletNetwork: networks.Network;
  address: string;
  signPsbt: WalletProvider["signPsbt"];
  pushTx: WalletProvider["pushTx"];
}

export const Delegations: React.FC<DelegationsProps> = ({
  finalityProvidersKV,
  delegationsAPI,
  delegationsLocalStorage,
  globalParamsData,
  publicKeyNoCoord,
  unbondingFee,
  withdrawalFee,
  btcWalletNetwork,
  address,
  signPsbt,
  pushTx,
}) => {
  // Local storage state for intermediate delegations (withdrawing, unbonding)
  const intermediateDelegationsLocalStorageKey =
    getIntermediateDelegationsLocalStorageKey(publicKeyNoCoord);

  const [
    intermediateDelegationsLocalStorage,
    setIntermediateDelegationsLocalStorage,
  ] = useLocalStorage<DelegationInterface[]>(
    intermediateDelegationsLocalStorageKey,
    [],
  );

  // The staking script allows users to on-demand unbond their locked stake before the staking transaction timelock expires, subject to an unbonding period.
  const handleUnbond = async (id: string) => {
    try {
      // Check if the data is available
      if (!delegationsAPI || !globalParamsData) {
        throw new Error("No data available");
      }

      // Find the delegation in the delegations retrieved from the API
      const delegation = delegationsAPI.find(
        (delegation) => delegation.staking_tx_hash_hex === id,
      );
      if (!delegation) {
        throw new Error("Not eligible for unbonding");
      }

      // Check if the unbonding is possible
      const unbondingEligibility = await getUnbondingEligibility(
        delegation.staking_tx_hash_hex,
      );
      if (!unbondingEligibility) {
        throw new Error("Not eligible for unbonding");
      }

      // Recreate the staking scripts
      const data = apiDataToStakingScripts(
        delegation,
        globalParamsData,
        publicKeyNoCoord,
      );
      if (!data) {
        throw new Error("Error recreating scripts");
      }

      // Destructure the staking scripts
      const {
        timelockScript,
        slashingScript,
        unbondingScript,
        unbondingTimelockScript,
      } = data;

      // Create the unbonding transaction
      const unsignedUnbondingTx = unbondingTransaction(
        unbondingScript,
        unbondingTimelockScript,
        timelockScript,
        slashingScript,
        Transaction.fromHex(delegation.staking_tx.tx_hex),
        unbondingFee,
        btcWalletNetwork,
        delegation.staking_tx.output_index,
      );

      // Sign the unbonding transaction
      const unbondingTx = Transaction.fromHex(
        await signPsbt(unsignedUnbondingTx.toHex()),
      );

      // Get the staker signature
      const stakerSignature = unbondingTx.ins[0].witness[0].toString("hex");

      // POST unbonding to the API
      const response = await postUnbonding({
        staker_signed_signature_hex: stakerSignature,
        staking_tx_hash_hex: delegation.staking_tx_hash_hex,
        unbonding_tx_hash_hex: Transaction.fromHex(unbondingTx.toHex()).getId(),
        unbonding_tx_hex: unbondingTx.toHex(),
      });

      // Update the local state with the new delegation
      setIntermediateDelegationsLocalStorage((delegations) => [
        toLocalStorageIntermediateDelegation(
          delegation.staking_tx_hash_hex,
          publicKeyNoCoord,
          delegation.finality_provider_pk_hex,
          delegation.staking_value,
          delegation.staking_tx.tx_hex,
          delegation.staking_tx.timelock,
          State.INTERMEDIATE_UNBONDING,
        ),
        ...delegations,
      ]);
    } catch (error: Error | any) {
      console.error(error?.message || "Error unbonding");
    }
  };

  // Withdrawing involves extracting funds for which the staking/unbonding period has expired from the staking/unbonding transaction.
  const handleWithdraw = async (id: string) => {
    try {
      // Check if the data is available
      if (!delegationsAPI || !globalParamsData) {
        throw new Error("No data available");
      }

      // Find the delegation in the delegations retrieved from the API
      const delegation = delegationsAPI.find(
        (delegation) => delegation.staking_tx_hash_hex === id,
      );
      if (!delegation) {
        throw new Error("Not eligible for withdrawing");
      }

      // Recreate the staking scripts
      const data = apiDataToStakingScripts(
        delegation,
        globalParamsData,
        publicKeyNoCoord,
      );
      if (!data) {
        throw new Error("Error recreating scripts");
      }

      // Destructure the staking scripts
      const {
        timelockScript,
        slashingScript,
        unbondingScript,
        unbondingTimelockScript,
      } = data;

      // Create the withdrawal transaction
      let unsignedWithdrawalTx;
      if (delegation?.unbonding_tx) {
        // Withdraw funds from an unbonding transaction that was submitted for early unbonding and the unbonding period has passed
        unsignedWithdrawalTx = withdrawEarlyUnbondedTransaction(
          unbondingTimelockScript,
          slashingScript,
          Transaction.fromHex(delegation.unbonding_tx.tx_hex),
          address,
          withdrawalFee,
          btcWalletNetwork,
          delegation.staking_tx.output_index,
        );
      } else {
        // Withdraw funds from a staking transaction in which the timelock naturally expired
        unsignedWithdrawalTx = withdrawTimelockUnbondedTransaction(
          timelockScript,
          slashingScript,
          unbondingScript,
          Transaction.fromHex(delegation.staking_tx.tx_hex),
          address,
          withdrawalFee,
          btcWalletNetwork,
          delegation.staking_tx.output_index,
        );
      }

      // Sign the withdrawal transaction
      const withdrawalTransaction = Transaction.fromHex(
        await signPsbt(unsignedWithdrawalTx.toHex()),
      );

      // Broadcast withdrawal transaction
      const txID = await pushTx(withdrawalTransaction.toHex());

      // Update the local state with the new delegation
      setIntermediateDelegationsLocalStorage((delegations) => [
        toLocalStorageIntermediateDelegation(
          delegation.staking_tx_hash_hex,
          publicKeyNoCoord,
          delegation.finality_provider_pk_hex,
          delegation.staking_value,
          delegation.staking_tx.tx_hex,
          delegation.staking_tx.timelock,
          State.INTERMEDIATE_WITHDRAWAL,
        ),
        ...delegations,
      ]);
    } catch (error: Error | any) {
      console.error(error?.message || "Error withdrawing");
    }
  };

  // Remove the intermediate delegations that are already present in the API
  useEffect(() => {
    if (!delegationsAPI) {
      return;
    }

    // check if delegationsAPI has status of unbonded or withdrawn
    // if it does, remove the intermediate delegation from local storage
    setIntermediateDelegationsLocalStorage((intermediateDelegations) =>
      intermediateDelegations?.filter(
        (intermediateDelegation) =>
          !delegationsAPI?.find(
            (delegation) =>
              delegation?.staking_tx_hash_hex ===
                intermediateDelegation?.staking_tx_hash_hex &&
              (delegation?.state === "unbonding_requested" ||
                delegation?.state === "withdrawn"),
          ),
      ),
    );
  }, [delegationsAPI, setIntermediateDelegationsLocalStorage]);

  // Combine the delegations from the API and local storage
  const combinedDelegationsData = delegationsAPI
    ? [...delegationsLocalStorage, ...delegationsAPI]
    : delegationsLocalStorage;

  return (
    <div className="card gap-4 bg-base-300 p-4">
      <div className="flex w-full">
        <h2 className="font-bold">Staking history</h2>
      </div>
      <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {combinedDelegationsData?.map((delegation) => {
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
              intermediateState={intermediateDelegation?.state}
            />
          );
        })}
      </div>
    </div>
  );
};

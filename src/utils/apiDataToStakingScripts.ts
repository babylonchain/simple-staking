import { StakingScriptData, StakingScripts } from "btc-staking-ts";

import { GlobalParamsData } from "@/app/api/getGlobalParams";
import { Delegation } from "@/app/api/getDelegations";

// Used to recreate scripts from the data received from the API
export const apiDataToStakingScripts = (
  item: Delegation,
  globalParams: GlobalParamsData | undefined,
  publicKeyNoCoord: string,
): StakingScripts | undefined => {
  if (!item || !globalParams || !publicKeyNoCoord) {
    throw new Error("Invalid data");
  }

  const generalErrorMessage = "Error while recreating scripts";

  // Convert covenant PKs to buffers
  const covenantPKsBuffer = globalParams?.covenant_pks?.map((pk) =>
    Buffer.from(pk, "hex"),
  );

  // Create staking script data
  let stakingScriptData;
  try {
    stakingScriptData = new StakingScriptData(
      Buffer.from(publicKeyNoCoord, "hex"),
      [Buffer.from(item?.finality_provider_pk_hex, "hex")],
      covenantPKsBuffer,
      globalParams.covenant_quorum,
      item.staking_tx.timelock,
      globalParams.unbonding_time,
      Buffer.from(globalParams.tag),
    );
    if (!stakingScriptData.validate()) {
      throw new Error("Invalid staking data");
    }
  } catch (error: Error | any) {
    console.error(error?.message || "Cannot build staking script data");
    return;
  }

  // Build scripts
  let scripts;
  try {
    scripts = stakingScriptData.buildScripts();
  } catch (error: Error | any) {
    throw new Error(error?.message || generalErrorMessage);
  }

  return scripts;
};

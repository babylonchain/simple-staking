import InfiniteScroll from "react-infinite-scroll-component";

import { FinalityProvider as FinalityProviderInterface } from "@/app/types/finalityProviders";
import { FinalityProvider } from "./FinalityProvider";
import { LoadingTableList, LoadingView } from "../../Loading/Loading";
import { QueryMeta } from "@/app/types/api";

interface FinalityProvidersProps {
  finalityProviders: FinalityProviderInterface[] | undefined;
  selectedFinalityProvider: FinalityProviderInterface | undefined;
  // called when the user selects a finality provider
  onFinalityProviderChange: (btcPkHex: string) => void;
  queryMeta: QueryMeta
}

// Staking form finality providers
export const FinalityProviders: React.FC<FinalityProvidersProps> = ({
  finalityProviders,
  selectedFinalityProvider,
  onFinalityProviderChange,
  queryMeta,
}) => {
  // If there are no finality providers, show loading
  if (!finalityProviders || finalityProviders.length === 0) {
    return <LoadingView />;
  }

  return (
    <>
      <p>
        Select a BTC Finality Provider or{" "}
        <a
          href="https://github.com/babylonchain/networks/tree/main/bbn-test-4/finality-providers"
          target="_blank"
          rel="noopener noreferrer"
          className="sublink text-primary hover:underline"
        >
          create your own
        </a>
        .
      </p>
      <div className="hidden gap-2 px-4 lg:grid lg:grid-cols-stakingFinalityProviders">
        <p>Finality Provider</p>
        <p>BTC PK</p>
        <p>Delegation</p>
        <p>Comission</p>
      </div>
      <div
        id="finality-providers"
        className="no-scrollbar max-h-[21rem] overflow-y-auto"
      >
        <InfiniteScroll
          className="flex flex-col gap-4"
          dataLength={finalityProviders?.length || 0}
          next={queryMeta.next}
          hasMore={queryMeta.hasMore}
          loader={queryMeta.isFetchingMore ? <LoadingTableList /> : null}
          scrollableTarget="finality-providers"
        >
          {" "}
          {finalityProviders?.map((fp) => (
            <FinalityProvider
              key={fp.btcPk}
              moniker={fp.description.moniker}
              pkHex={fp.btcPk}
              stakeSat={fp.activeTVLSat}
              comission={fp.commission}
              selected={selectedFinalityProvider?.btcPk === fp.btcPk}
              onClick={() => onFinalityProviderChange(fp.btcPk)}
            />
          ))}
        </InfiniteScroll>
      </div>
    </>
  );
};

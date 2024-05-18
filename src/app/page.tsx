"use client";

import { useEffect, useState } from "react";
import { initBTCCurve } from "btc-staking-ts";
import { useLocalStorage } from "usehooks-ts";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { networks } from "bitcoinjs-lib";

import {
  getWallet,
  toNetwork,
  isSupportedAddressType,
  getPublicKeyNoCoord,
} from "@/utils/wallet/index";
import { getFinalityProviders } from "./api/getFinalityProviders";
import { Delegation, getDelegations } from "./api/getDelegations";
import { Staking } from "./components/Staking/Staking";
import { WalletProvider } from "@/utils/wallet/wallet_provider";
import { Delegations } from "./components/Delegations/Delegations";
import { getDelegationsLocalStorageKey } from "@/utils/local_storage/getDelegationsLocalStorageKey";
import { useTheme } from "./hooks/useTheme";
import { Header } from "./components/Header/Header";
import { Stats } from "./components/Stats/Stats";
import { getStats } from "./api/getStats";
import { Summary } from "./components/Summary/Summary";
import { DelegationState } from "./types/delegationState";
import { Footer } from "./components/Footer/Footer";
import { getCurrentGlobalParamsVersion } from "@/utils/globalParams";
import { FAQ } from "./components/FAQ/FAQ";
import { ConnectModal } from "./components/Modals/ConnectModal";
import { NetworkBadge } from "./components/NetworkBadge/NetworkBadge";
import { getGlobalParams } from "./api/getGlobalParams";

interface HomeProps {}

const withdrawalFee = 500;

const Home: React.FC<HomeProps> = () => {
  const { lightSelected } = useTheme();

  const [btcWallet, setBTCWallet] = useState<WalletProvider>();
  const [btcWalletBalance, setBTCWalletBalance] = useState(0);
  const [btcWalletNetwork, setBTCWalletNetwork] = useState<networks.Network>();
  const [publicKeyNoCoord, setPublicKeyNoCoord] = useState("");

  const [address, setAddress] = useState("");

  const { data: paramWithContext, isLoading: isLoadingCurrentParams } =
    useQuery({
      queryKey: ["global params"],
      queryFn: async () => {
        const [height, versions] = await Promise.all([
          btcWallet!.getBTCTipHeight(),
          getGlobalParams(),
        ]);
        try {
          return await getCurrentGlobalParamsVersion(height + 1, versions);
        } catch (error) {
          // No global params version found, it means the staking is not yet enabled
          return {
            currentVersion: undefined,
            isApprochingNextVersion: false,
          };
        }
      },
      refetchInterval: 60000, // 1 minute
      // Should be enabled only when the wallet is connected
      enabled: !!btcWallet,
    });

  const { data: finalityProvidersData } = useQuery({
    queryKey: ["finality providers"],
    queryFn: getFinalityProviders,
    refetchInterval: 60000, // 1 minute
    select: (data) => data.data,
  });

  const { data: delegationsData, fetchNextPage: _fetchNextDelegationsPage } =
    useInfiniteQuery({
      queryKey: ["delegations", address],
      queryFn: ({ pageParam = "" }) =>
        getDelegations(pageParam, publicKeyNoCoord),
      getNextPageParam: (lastPage) => lastPage?.pagination?.next_key,
      initialPageParam: "",
      refetchInterval: 60000, // 1 minute
      enabled: !!(btcWallet && publicKeyNoCoord && address),
      select: (data) => data?.pages?.flatMap((page) => page?.data),
    });

  const { data: statsData, isLoading: statsDataIsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: 60000, // 1 minute
    select: (data) => data.data,
  });

  // Initializing btc curve is a required one-time operation
  useEffect(() => {
    initBTCCurve();
  }, []);

  // Local storage state for delegations
  const delegationsLocalStorageKey =
    getDelegationsLocalStorageKey(publicKeyNoCoord);

  const [delegationsLocalStorage, setDelegationsLocalStorage] = useLocalStorage<
    Delegation[]
  >(delegationsLocalStorageKey, []);

  const [connectModalOpen, setConnectModalOpen] = useState(false);

  const handleConnectModal = () => {
    setConnectModalOpen(true);
  };

  const handleDisconnectBTC = () => {
    setBTCWallet(undefined);
    setBTCWalletBalance(0);
    setBTCWalletNetwork(undefined);
    setPublicKeyNoCoord("");
    setAddress("");
  };

  const handleConnectBTC = async () => {
    // close the modal
    setConnectModalOpen(false);

    try {
      const walletProvider = getWallet();
      await walletProvider.connectWallet();
      const address = await walletProvider.getAddress();
      // check if the wallet address type is supported in babylon
      const supported = isSupportedAddressType(address);
      if (!supported) {
        throw new Error(
          "Invalid address type. Please use a Native SegWit or Taptoor",
        );
      }

      const balance = await walletProvider.getBalance();
      const publicKeyNoCoord = getPublicKeyNoCoord(
        await walletProvider.getPublicKeyHex(),
      );
      setBTCWallet(walletProvider);
      setBTCWalletBalance(balance);
      setBTCWalletNetwork(toNetwork(await walletProvider.getNetwork()));
      setAddress(address);
      setPublicKeyNoCoord(publicKeyNoCoord.toString("hex"));
    } catch (error: Error | any) {
      console.error(error?.message || error);
    }
  };

  // Subscribe to account changes
  useEffect(() => {
    if (btcWallet) {
      let once = false;
      btcWallet.on("accountChanged", () => {
        if (!once) {
          handleConnectBTC();
        }
      });
      return () => {
        once = true;
      };
    }
  }, [btcWallet]);

  // Remove the delegations that are already present in the API
  useEffect(() => {
    if (!delegationsData) {
      return;
    }
    setDelegationsLocalStorage((localDelegations) =>
      localDelegations?.filter(
        (localDelegation) =>
          !delegationsData?.find(
            (delegation) =>
              delegation?.staking_tx_hash_hex ===
              localDelegation?.staking_tx_hash_hex,
          ),
      ),
    );
  }, [delegationsData, setDelegationsLocalStorage]);

  // Finality providers key-value map { pk: moniker }
  const finalityProvidersKV = finalityProvidersData?.reduce(
    (acc, fp) => ({ ...acc, [fp?.btc_pk]: fp?.description?.moniker }),
    {},
  );

  let totalStaked = 0;

  if (delegationsData) {
    totalStaked = delegationsData
      // using only active delegations
      .filter((delegation) => delegation?.state === DelegationState.ACTIVE)
      .reduce(
        (accumulator: number, item) => accumulator + item?.staking_value,
        0,
      );
  }

  // these constants are needed for easier prop passing
  const overTheCap =
    paramWithContext?.currentVersion && statsData
      ? paramWithContext.currentVersion.stakingCap <= statsData.active_tvl
      : false;

  return (
    <main
      className={`main-app relative h-full min-h-svh w-full ${lightSelected ? "light" : "dark"}`}
    >
      <NetworkBadge />
      <Header
        onConnect={handleConnectModal}
        onDisconnect={handleDisconnectBTC}
        address={address}
        balance={btcWalletBalance}
      />
      <div className="container mx-auto flex justify-center p-6">
        <div className="container flex flex-col gap-6">
          <Stats
            data={statsData}
            isLoading={statsDataIsLoading}
            stakingCap={paramWithContext?.currentVersion?.stakingCap}
          />
          {address && btcWalletBalance && (
            <Summary
              address={address}
              totalStaked={totalStaked}
              balance={btcWalletBalance}
            />
          )}
          <Staking
            finalityProviders={finalityProvidersData}
            paramWithContext={paramWithContext}
            isWalletConnected={!!btcWallet}
            overTheCap={overTheCap}
            onConnect={handleConnectModal}
            isLoading={isLoadingCurrentParams}
            btcWallet={btcWallet}
            btcWalletNetwork={btcWalletNetwork}
            address={address}
            publicKeyNoCoord={publicKeyNoCoord}
            setDelegationsLocalStorage={setDelegationsLocalStorage}
          />
          {btcWallet &&
            delegationsData &&
            paramWithContext?.currentVersion &&
            btcWalletNetwork &&
            finalityProvidersKV && (
              <Delegations
                finalityProvidersKV={finalityProvidersKV}
                delegationsAPI={delegationsData}
                delegationsLocalStorage={delegationsLocalStorage}
                globalParamsVersion={paramWithContext.currentVersion}
                publicKeyNoCoord={publicKeyNoCoord}
                unbondingFee={paramWithContext.currentVersion.unbondingFee}
                withdrawalFee={withdrawalFee}
                btcWalletNetwork={btcWalletNetwork}
                address={address}
                signPsbt={btcWallet.signPsbt}
                pushTx={btcWallet.pushTx}
              />
            )}
          {/* At this point of time is not used */}
          {/* <StakersFinalityProviders
            finalityProviders={finalityProvidersData}
            totalActiveTVL={statsData?.active_tvl}
            connected={!!btcWallet}
          /> */}
        </div>
      </div>
      <FAQ />
      <Footer />
      <ConnectModal
        open={connectModalOpen}
        onClose={setConnectModalOpen}
        onConnect={handleConnectBTC}
        connectDisabled={!!address}
      />
    </main>
  );
};

export default Home;

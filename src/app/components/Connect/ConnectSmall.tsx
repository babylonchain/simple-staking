import { useRef, useState } from "react";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { FaBitcoin } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { PiWalletBold } from "react-icons/pi";
import { Tooltip } from "react-tooltip";
import { useOnClickOutside } from "usehooks-ts";

import {
  API_ERROR_MESSAGE,
  GEO_BLOCK_MESSAGE,
  HealthCheckResult,
  HealthCheckStatus,
} from "@/app/types/healthCheck";
import { getNetworkConfig } from "@/config/network.config";
import { satoshiToBtc } from "@/utils/btcConversions";
import { maxDecimals } from "@/utils/maxDecimals";
import { trim } from "@/utils/trim";

import { Hash } from "../Hash/Hash";
import { LoadingSmall } from "../Loading/Loading";

interface ConnectSmallProps {
  onConnect: () => void;
  address: string;
  btcWalletBalanceSat?: number;
  onDisconnect: () => void;
  apiAvailable?: HealthCheckResult;
}

export const ConnectSmall: React.FC<ConnectSmallProps> = ({
  onConnect,
  address,
  btcWalletBalanceSat,
  onDisconnect,
  apiAvailable,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const handleClickOutside = () => {
    setShowMenu(false);
  };

  const ref = useRef(null);
  useOnClickOutside(ref, handleClickOutside);

  const { coinName, networkName } = getNetworkConfig();

  const renderApiAvailableTooltip = () => {
    if (!apiAvailable) return null;

    const message =
      apiAvailable.status === HealthCheckStatus.GeoBlocked
        ? GEO_BLOCK_MESSAGE
        : API_ERROR_MESSAGE;

    return (
      <>
        <span
          className="cursor-pointer text-xs"
          data-tooltip-id={`tooltip-connect-${apiAvailable.status}`}
          data-tooltip-content={message}
          data-tooltip-place="bottom"
        >
          <AiOutlineInfoCircle />
        </span>
        <Tooltip id={`tooltip-connect-${apiAvailable.status}`} />
      </>
    );
  };

  const isApiNormal = apiAvailable?.status === HealthCheckStatus.Normal;

  return address ? (
    <div className="relative mr-[-10px] text-sm hidden md:flex" ref={ref}>
      <button
        className="flex cursor-pointer outline-none items-stretch"
        onClick={() => setShowMenu(!showMenu)}
      >
        <div className="flex items-center rounded-lg border border-base-200/75 p-2 pr-4">
          <div className="flex items-center gap-1">
            <FaBitcoin className="text-primary" />
            {typeof btcWalletBalanceSat === "number" ? (
              <p>
                <strong>
                  {maxDecimals(satoshiToBtc(btcWalletBalanceSat), 8)} {coinName}
                </strong>
              </p>
            ) : (
              <LoadingSmall text="Loading..." />
            )}
          </div>
        </div>
        <div className="relative right-[10px] flex items-center rounded-lg border border-primary bg-[#fdf2ec] p-2 dark:border-white dark:bg-base-200">
          {trim(address)}
        </div>
      </button>
      {showMenu && (
        <div
          className="absolute right-[10px] top-0 z-10 mt-[4.5rem] flex flex-col gap-4 rounded-lg bg-base-300 p-4 shadow-lg"
          style={{
            // margin - border
            width: "calc(100% - 8px)",
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold dark:text-neutral-content">Settings</h3>
            <button
              className="btn btn-circle btn-ghost btn-sm"
              onClick={() => setShowMenu(false)}
            >
              <IoMdClose size={24} />
            </button>
          </div>
          <div className="flex flex-col">
            <Hash value={address} address noFade fullWidth />
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setShowMenu(false);
              onDisconnect();
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  ) : (
    <div className="flex items-center gap-1">
      <button
        className="btn-primary btn h-[2.5rem] min-h-[2.5rem] rounded-full px-2 text-white md:rounded-lg"
        onClick={onConnect}
        disabled={!!address || !isApiNormal}
      >
        <PiWalletBold size={20} className="flex md:hidden" />
        <span className="hidden md:flex">Connect to {networkName} network</span>
      </button>
      {!isApiNormal && renderApiAvailableTooltip()}
    </div>
  );
};

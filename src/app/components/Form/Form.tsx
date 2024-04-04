import { FinalityProvider } from "@/app/api/getFinalityProviders";

interface FormProps {
  amount: number;
  onAmountChange: (amount: number) => void;
  duration: number;
  onDurationChange: (term: number) => void;
  disabled: boolean;
  finalityProviders: FinalityProvider[] | undefined;
  finalityProvider: FinalityProvider | undefined;
  onFinalityProviderChange: (btcPkHex: string) => void;
  onSign: () => void;
}

export const Form: React.FC<FormProps> = ({
  amount,
  onAmountChange,
  duration: term,
  onDurationChange: onTermChange,
  disabled,
  finalityProviders,
  finalityProvider,
  onFinalityProviderChange,
  onSign,
}) => {
  const signReady = amount > 0 && term > 0 && finalityProvider;
  return (
    <div className="card bg-base-300">
      <div className="card-body items-center gap-4">
        <label className="form-control w-full max-w-sm">
          <div className="label">
            <span className="label-text">Amount</span>
            <span className="label-text-alt">BTC</span>
          </div>
          <input
            type="number"
            placeholder="BTC"
            className="input input-bordered w-full"
            min={0.00001}
            step={0.00001}
            value={amount}
            onChange={(e) => onAmountChange(Number(e.target.value))}
            disabled={disabled}
          />
        </label>
        <label className="form-control w-full max-w-sm">
          <div className="label">
            <span className="label-text">Duration</span>
            <span className="label-text-alt">Blocks</span>
          </div>
          <input
            type="number"
            placeholder="Blocks"
            className="input input-bordered w-full"
            min={1}
            max={454}
            value={term}
            onChange={(e) => onTermChange(Number(e.target.value))}
            disabled={disabled}
          />
        </label>
        <label className="form-control w-full max-w-sm">
          <div className="label">
            <span className="label-text">Finality provider</span>
          </div>
          <select
            className="select select-bordered"
            onChange={(e) => onFinalityProviderChange(e.target.value)}
            value={finalityProvider ? finalityProvider.btc_pk : "-"}
            disabled={disabled || !finalityProviders?.length}
          >
            <option key="-" value="-">
              {!finalityProviders?.length
                ? "Loading..."
                : "Choose a finality provider"}
            </option>
            {finalityProviders?.map((provider) => (
              <option key={provider.btc_pk} value={provider.btc_pk}>
                {provider.description.moniker}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn btn-primary mt-2 w-full max-w-sm uppercase"
          disabled={disabled || !signReady}
          onClick={onSign}
        >
          Sign
        </button>
      </div>
    </div>
  );
};

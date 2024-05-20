export enum ErrorState {
  GET_STAKING = "GET_STAKING",
  GET_DELEGATION = "GET_DELEGATION",
  GET_FINALITY_PROVIDER = "GET_FINALITY_PROVIDER",
  GET_GLOBAL_PARAMS = "GET_GLOBAL_PARAMS",
  GET_STATS = "GET_STATS",
  GET_UNBOUNDING_ELIGIBILITY = "GET_UNBOUNDING_ELIGIBILITY",
  UNBOUNDING = "UNBOUNDING",
  SWITCH_NETWORK = "SWITCH_NETWORK",
  WITHDRAW = "WITHDRAW",
  STAKING = "STAKING",
}

export interface ErrorType {
  message: string;
  errorState?: ErrorState;
  errorTime: Date;
}

export interface ErrorHandlerParam {
  error: Error | null;
  hasError: boolean;
  errorState: ErrorState;
  refetchFunction: () => void;
}


export interface ShowErrorParams {
  error: ErrorType;
  retryAction?: () => void;
}
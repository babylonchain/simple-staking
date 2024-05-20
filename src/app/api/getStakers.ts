import { apiWrapper } from "./apiWrapper";

export interface Stakers {
  data: StakersData[];
  pagination: Pagination;
}

export interface StakersData {
  staker_pk_hex: string;
  active_tvl: number;
  total_tvl: number;
  active_delegations: number;
  total_delegations: number;
}

export interface Pagination {
  next_key: string;
}

export const getStakers = async (): Promise<Stakers> => {
  // Intentionally used without pagination for now
  const limit = 50;
  // const reverse = false;

  const params = {
    // "pagination_key": encode(key),
    // "pagination_reverse": reverse,
    pagination_limit: limit,
  };

  const response = await apiWrapper(
    "GET",
    "/v1/stats/staker",
    "Error getting stakers",
    params,
  );

  return response.data;
};

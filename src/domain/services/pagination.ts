import { DomainError } from "@/domain/errors/domain-error";

export const LIST_PAGE_SIZE = 20;
export const SEARCH_QUERY_MAX_LENGTH = 100;

export type ListInput = {
  page?: number;
  query?: string;
};

export type NormalizedListInput = {
  page: number;
  query?: string;
};

export function normalizePageNumber(page: number | undefined): number {
  if (typeof page !== "number" || !Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
}

export function normalizeSearchQuery(query: string | undefined): string | undefined {
  const trimmedQuery = query?.trim() ?? "";

  if (!trimmedQuery) {
    return undefined;
  }

  if (trimmedQuery.length > SEARCH_QUERY_MAX_LENGTH) {
    throw new DomainError(
      `Search query must have at most ${SEARCH_QUERY_MAX_LENGTH} characters.`
    );
  }

  return trimmedQuery;
}

export function normalizeListInput(input: ListInput): NormalizedListInput {
  return {
    page: normalizePageNumber(input.page),
    query: normalizeSearchQuery(input.query)
  };
}

export function calculateTotalPages(totalCount: number): number {
  if (totalCount <= 0) {
    return 0;
  }

  return Math.ceil(totalCount / LIST_PAGE_SIZE);
}

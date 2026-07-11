export function buildListHref(
  path: string,
  input: {
    page?: number;
    query?: string;
    customerId?: string;
    status?: string;
  }
): string {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("query", input.query);
  }

  if (input.customerId) {
    params.set("customerId", input.customerId);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  const queryString = params.toString();

  return queryString ? `${path}?${queryString}` : path;
}

export type PageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export async function readSearchParams(
  searchParams: PageSearchParams | undefined
): Promise<Record<string, string | string[] | undefined>> {
  return searchParams ? searchParams : {};
}

export function readStringSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = searchParams[key];

  return typeof value === "string" ? value : undefined;
}

export function readPageSearchParam(
  searchParams: Record<string, string | string[] | undefined>
): number | undefined {
  const page = readStringSearchParam(searchParams, "page");

  return page ? Number(page) : undefined;
}

import { ValidationError } from "@/domain/errors/validation-error";
import { normalizeSearchQuery } from "@/lib/global-search";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";
import { searchOrganizationRecords } from "@/server/repositories/global-search-repository";

export async function searchForOrganization(
  context: AuthenticatedContext,
  input: string,
  search = searchOrganizationRecords
) {
  if (input.length > 100) throw new ValidationError("Use até 100 caracteres na busca.", {});
  const query = normalizeSearchQuery(input);
  if (query.length < 2) return [];
  return search(context, query);
}

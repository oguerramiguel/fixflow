import { redirect } from "next/navigation";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import { formatDate, formatDateTime } from "@/app/app/format";
import { InviteUserForm } from "./invite-user-form";
import { UserActions } from "./user-actions";
import { PageHeader } from "@/components/ui/primitives";
import { listUsersForOrganization } from "@/server/services/user-management-service";

function getStatusClassName(status: "ACTIVE" | "INVITED" | "DISABLED"): string {
  if (status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-300";
  }

  if (status === "DISABLED") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200";
}

export default async function OrganizationUsersPage() {
  const context = await requireAuthenticatedContextOrRedirect();
  let users;

  try {
    users = await listUsersForOrganization(context);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/app");
    }

    throw error;
  }

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Configurações" title="Usuários da organização" description="Convide pessoas, controle funções, desative acessos e revogue sessões. Somente proprietários podem usar estas operações." />

      <section aria-label="Novo convite">
        <InviteUserForm />
      </section>

      <section className="data-table-wrap" aria-labelledby="team-title">
        <div className="border-b px-5 py-4 sm:px-6">
          <h2 id="team-title" className="section-title">
            Equipe ({users.length})
          </h2>
          <p className="mt-1 text-sm muted-text">Acessos e permissões da organização</p>
        </div>

        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[980px]">
              <thead>
                <tr>
                  <th>
                    Usuario
                  </th>
                  <th>
                    Funcao
                  </th>
                  <th>
                    Status
                  </th>
                  <th>
                    Criado em
                  </th>
                  <th className="min-w-96">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="align-top">
                      <p className="font-semibold text-slate-950">
                        {user.name}
                        {user.isCurrentUser ? (
                          <span className="ml-2 text-xs font-medium text-slate-500">
                            Voce
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                    </td>
                    <td className="align-top">
                      {user.roleLabel}
                    </td>
                    <td className="align-top">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(user.status)}`}
                      >
                        {user.statusLabel}
                      </span>
                      {user.invitation &&
                      user.invitation.status !== "USED" ? (
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          {user.invitation.status === "PENDING"
                            ? `Expira em ${formatDateTime(user.invitation.expiresAt)}`
                            : user.invitation.statusLabel}
                        </p>
                      ) : null}
                    </td>
                    <td className="align-top">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="align-top">
                      <UserActions
                        userId={user.id}
                        role={user.role}
                        status={user.status}
                        invitationStatus={user.invitation?.status}
                        isCurrentUser={user.isCurrentUser}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-sm muted-text">
            Nenhum usuario encontrado.
          </p>
        )}
      </section>
    </div>
  );
}

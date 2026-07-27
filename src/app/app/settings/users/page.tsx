import { redirect } from "next/navigation";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import { formatDate, formatDateTime } from "@/app/app/format";
import { InviteUserForm } from "./invite-user-form";
import { UserActions } from "./user-actions";
import { listUsersForOrganization } from "@/server/services/user-management-service";

function getStatusClassName(status: "ACTIVE" | "INVITED" | "DISABLED"): string {
  if (status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "DISABLED") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-amber-200 bg-amber-50 text-amber-900";
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
    <section>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Configuracoes
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">
          Usuarios da organizacao
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Convide pessoas, controle funcoes, desative acessos e revogue sessoes.
          Somente proprietarios podem usar estas operacoes.
        </p>
      </div>

      <div className="mt-8">
        <InviteUserForm />
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-950">
            Equipe ({users.length})
          </h3>
        </div>

        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Funcao
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Criado em
                  </th>
                  <th className="min-w-80 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-4 align-top">
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
                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      {user.roleLabel}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(user.status)}`}
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
                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-4 align-top">
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
          <p className="px-5 py-8 text-sm text-slate-600">
            Nenhum usuario encontrado.
          </p>
        )}
      </div>
    </section>
  );
}

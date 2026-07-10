import { DomainError } from "@/domain/errors/domain-error";

export class AuthorizationError extends DomainError {
  constructor(message = "Permissao insuficiente.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

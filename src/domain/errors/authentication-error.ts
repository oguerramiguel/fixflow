import { DomainError } from "@/domain/errors/domain-error";

export const INVALID_CREDENTIALS_MESSAGE = "Email ou senha invalidos.";
export const AUTHENTICATION_REQUIRED_MESSAGE = "Autenticacao obrigatoria.";

export class AuthenticationError extends DomainError {
  constructor(message = AUTHENTICATION_REQUIRED_MESSAGE) {
    super(message);
    this.name = "AuthenticationError";
  }
}

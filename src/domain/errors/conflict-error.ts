import { DomainError } from "@/domain/errors/domain-error";

export class ConflictError extends DomainError {
  constructor(
    message = "A ordem de servico foi alterada por outra operacao. Atualize a pagina e tente novamente."
  ) {
    super(message);
    this.name = "ConflictError";
  }
}

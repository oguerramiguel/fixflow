import { DomainError } from "@/domain/errors/domain-error";

export class NotFoundError extends DomainError {
  constructor(message = "Recurso nao encontrado.") {
    super(message);
    this.name = "NotFoundError";
  }
}

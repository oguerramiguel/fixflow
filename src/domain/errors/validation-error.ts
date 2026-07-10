import { DomainError } from "@/domain/errors/domain-error";

export class ValidationError<
  TFieldName extends string = string
> extends DomainError {
  readonly fieldErrors: Partial<Record<TFieldName, string>>;

  constructor(
    message: string,
    fieldErrors: Partial<Record<TFieldName, string>>
  ) {
    super(message);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

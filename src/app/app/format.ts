export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value);
}

export function formatEquipmentType(type: string): string {
  switch (type) {
    case "NOTEBOOK":
      return "Notebook";
    case "DESKTOP":
      return "Desktop";
    default:
      return "Outro";
  }
}

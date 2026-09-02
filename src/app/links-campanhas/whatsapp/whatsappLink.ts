export const DEFAULT_IDENTIFICATION_TEMPLATE = "Código do afiliado: {{codigo}}";

export function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function maskBrazilianPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  const split = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
}

export function buildPreviewMessage(
  message: string,
  template: string,
  append: boolean,
  values: { codigo?: string; afiliado?: string; campanha?: string },
) {
  if (!append) return message.trim();
  const identification = template.replace(
    /{{\s*(codigo|afiliado|campanha)\s*}}/gi,
    (_, key: "codigo" | "afiliado" | "campanha") => values[key.toLowerCase() as keyof typeof values] || `{{${key}}}`,
  ).trim();
  return [message.trim(), identification].filter(Boolean).join("\n\n");
}

export function buildPreviewUrl(phone: string, message: string) {
  return `https://wa.me/${normalizeBrazilianPhone(phone)}?text=${encodeURIComponent(message)}`;
}

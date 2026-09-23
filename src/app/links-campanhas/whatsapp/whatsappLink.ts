export const DEFAULT_IDENTIFICATION_TEMPLATE = "*Identificação do atendimento*\n• Afiliado: {{afiliado}}\n• Código: {{codigo}}";

const WAVING_HAND_EMOJI = "\u{1F44B}";
const WINDOWS_1252_BYTES: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

function decodeMojibakeSequence(sequence: string) {
  const bytes = Array.from(sequence, (character) => {
    const codePoint = character.codePointAt(0) || 0;
    return codePoint <= 0xff ? codePoint : WINDOWS_1252_BYTES[codePoint];
  });
  if (bytes.some((byte) => byte === undefined)) return sequence;

  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
    return /\p{Extended_Pictographic}/u.test(decoded) ? decoded : sequence;
  } catch {
    return sequence;
  }
}

export function repairWhatsAppEmoji(value: string) {
  return String(value || "")
    .replace(/\u00f0[\s\S]{3}/g, decodeMojibakeSequence)
    .replace(/\u00e2[\s\S]{2}/g, decodeMojibakeSequence)
    .replace(/(ol[aá]!\s*)\uFFFD/giu, `$1${WAVING_HAND_EMOJI}`);
}

export function normalizeWhatsAppText(value: string) {
  return repairWhatsAppEmoji(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function maskBrazilianPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12 && digits.slice(2, 5) === "800") {
    const national = digits.slice(2, 12);
    return `+55 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  }
  if (digits.startsWith("55") && digits.length >= 12) {
    const national = digits.slice(2, 13);
    const ddd = national.slice(0, 2);
    const subscriber = national.slice(2);
    const split = subscriber.length >= 9 ? 5 : 4;
    return `+55 (${ddd}) ${subscriber.slice(0, split)}-${subscriber.slice(split)}`;
  }
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  const split = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
}

export function isValidWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function buildPreviewMessage(
  message: string,
  template: string,
  append: boolean,
  values: { codigo?: string; afiliado?: string; campanha?: string },
) {
  if (!append) return normalizeWhatsAppText(message);
  const identification = normalizeWhatsAppText(template).replace(
    /{{\s*(codigo|afiliado|campanha)\s*}}/gi,
    (_, key: "codigo" | "afiliado" | "campanha") => values[key.toLowerCase() as keyof typeof values] || `{{${key}}}`,
  ).trim();
  return [normalizeWhatsAppText(message), identification].filter(Boolean).join("\n\n");
}

export function buildPreviewUrl(phone: string, message: string) {
  return `https://wa.me/${normalizeBrazilianPhone(phone)}?text=${encodeURIComponent(normalizeWhatsAppText(message))}`;
}

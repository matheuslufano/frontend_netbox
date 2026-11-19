type RuleField = {
  label: string;
  type?: "number" | "date";
  options?: string[];
  hint?: string;
  step?: string;
};

/** Structured lines share the existing public text contract. Legacy prose stays editable in full. */
export default function CampaignRuleFields({ field, text, rules, onChange }: {
  field: string;
  text: string;
  rules: RuleField[];
  onChange: (value: string) => void;
}) {
  const lines = text.split("\n");
  return rules.map(({ label, type, options, hint, step }, index) => {
    const prefix = `${label}: `;
    const existing = lines.findIndex((line) => line.startsWith(prefix));
    const value = existing < 0 ? "" : lines[existing].slice(prefix.length);
    const id = `locomotiva-settings-${field}-rule-${index + 1}`;
    const update = (next: string) => {
      const updated = [...lines];
      if (existing >= 0) updated.splice(existing, 1, ...(next ? [prefix + next] : []));
      else if (next) updated.push(prefix + next);
      onChange(updated.join("\n").trim());
    };
    return <label key={label}>{label} · opcional
      {options ? <select id={id} value={value} onChange={(event) => update(event.target.value)}>
        <option value="">Selecionar</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select> : <input id={id} type={type ?? "text"} min={type === "number" ? 0 : undefined} step={step} value={value} onChange={(event) => update(event.target.value)} />}
      {hint && <small>{hint}</small>}
    </label>;
  });
}

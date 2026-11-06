import { useRef } from "react";
import { LuChartNoAxesCombined, LuFiles } from "react-icons/lu";
import styles from "./analytics/Analytics.module.css";
export type ManagementTab = "articles" | "analytics";
export default function ManagementTabs({
  value,
  onChange,
}: {
  value: ManagementTab;
  onChange: (value: ManagementTab) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs = [
    { id: "articles", label: "Artigos", Icon: LuFiles },
    { id: "analytics", label: "Desempenho", Icon: LuChartNoAxesCombined },
  ] as const;
  return (
    <div className={styles.tabs} role="tablist" aria-label="Gestão do Blog">
      {tabs.map(({ id, label, Icon }, index) => (
        <button
          key={id}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="button"
          id={`blog-tab-${id}`}
          role="tab"
          aria-selected={value === id}
          aria-controls={`blog-panel-${id}`}
          tabIndex={value === id ? 0 : -1}
          onClick={() => onChange(id)}
          onKeyDown={(event) => {
            if (
              ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
            ) {
              event.preventDefault();
              const next =
                event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
              onChange(tabs[next].id);
              refs.current[next]?.focus();
            }
          }}
        >
          <Icon aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

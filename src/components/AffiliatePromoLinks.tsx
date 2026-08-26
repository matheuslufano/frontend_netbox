"use client";

import { useState } from "react";

export type AffiliatePromoLinkItem = {
  id: number;
  promoLink: string;
  originalUrl?: string;
};

type AffiliatePromoLinksProps = {
  links: AffiliatePromoLinkItem[];
};

export default function AffiliatePromoLinks({ links }: AffiliatePromoLinksProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  if (links.length === 0) {
    return null;
  }

  const missingPromo = links.some(
    (link) => !link.promoLink || !String(link.promoLink).trim()
  );

  if (missingPromo) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: 12,
          background: "#fff8e6",
          borderRadius: 8,
          fontSize: 14,
        }}
      >
        <strong>Links de divulgação</strong>
        <p style={{ margin: "8px 0 0" }}>
          A API não retornou o campo <code>promoLink</code>. Atualize o backend e
          recarregue a página.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <strong>Links completos para enviar ao afiliado</strong>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "8px 0 0",
        }}
      >
        {links.map((link) => {
          const href = link.promoLink.trim();

          return (
            <li
              key={link.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
                padding: "10px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>
                  Link completo
                </div>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ wordBreak: "break-all" }}
                >
                  {href}
                </a>
                {link.originalUrl && (
                  <div
                    style={{
                      color: "#666",
                      fontSize: 13,
                      marginTop: 4,
                      wordBreak: "break-all",
                    }}
                  >
                    Destino: {link.originalUrl}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(href);
                    setCopiedId(link.id);
                    window.setTimeout(() => setCopiedId(null), 2000);
                  } catch {
                    setCopiedId(-1);
                    window.setTimeout(() => setCopiedId(null), 2000);
                  }
                }}
              >
                {copiedId === link.id ? "Copiado!" : "Copiar link"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

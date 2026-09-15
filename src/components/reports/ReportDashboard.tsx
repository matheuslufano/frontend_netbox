"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";
import { FiBarChart2, FiCheckCircle, FiFilter, FiLink, FiMousePointer, FiTarget, FiUsers } from "react-icons/fi";
import { Campaign, CampaignConversionEvent, CampaignLink, getApiErrorMessage, listarCampanhas, listarLinksWhatsApp, WhatsAppLinkItem } from "@/lib/api";
import { EmptyState, ReportHeader, ReportKpiCard, ReportSection, reportStyles as styles } from "./ReportsUi";
import AffiliateLinkReport from "./AffiliateLinkReport";
import { Timeline } from "./ClicksReport";
import { useRealtimeEvents } from "@/lib/useRealtimeEvents";

type ReportKind = "whatsapp" | "link" | "campanha";
const titles = {
  whatsapp: ["Relatório do WhatsApp", "Acompanhe atendimentos e resultados atribuídos aos links de divulgação no WhatsApp."],
  link: ["Relatório de Link Individual", "Analise em detalhe o desempenho de um link específico de divulgação."],
  campanha: ["Relatório de Campanha", "Compare afiliados e links em uma visão consolidada da campanha."],
} as const;

export default function ReportDashboard({ kind }: { kind: ReportKind }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [whatsappLinks, setWhatsappLinks] = useState<WhatsAppLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [linkId, setLinkId] = useState("");
  const [affiliateId, setAffiliateId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [realtimeRefreshToken, setRealtimeRefreshToken] = useState(0);
  const realtimeRefreshTimerRef = useRef<number | null>(null);

  const refreshFromEvent = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    if (realtimeRefreshTimerRef.current !== null) {
      window.clearTimeout(realtimeRefreshTimerRef.current);
    }
    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      realtimeRefreshTimerRef.current = null;
      setRealtimeRefreshToken((current) => current + 1);
    }, 250);
  }, []);
  useRealtimeEvents(refreshFromEvent);
  useEffect(
    () => () => {
      if (realtimeRefreshTimerRef.current !== null) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    Promise.all([listarCampanhas(), kind === "whatsapp" ? listarLinksWhatsApp() : Promise.resolve([])])
      .then(([campaignData, whatsappLinkData]) => { setCampaigns(campaignData); setWhatsappLinks(whatsappLinkData); setError(""); })
      .catch((reason) => setError(getApiErrorMessage(reason, "Não foi possível carregar os dados dos relatórios.")))
      .finally(() => setLoading(false));
  }, [kind, realtimeRefreshToken]);

  const selectedCampaign = campaigns.find((item) => String(item.id) === campaignId);
  const allCampaignLinks = selectedCampaign ? selectedCampaign.links : campaigns.flatMap((item) => item.links);
  const whatsappLinkIds = useMemo(() => new Set(whatsappLinks.map((item) => item.link.id)), [whatsappLinks]);
  const whatsappLinkNames = useMemo(() => new Map(whatsappLinks.map((item) => [item.link.id, item.name])), [whatsappLinks]);
  const campaignLinks = kind === "whatsapp"
    ? allCampaignLinks.filter((link) => whatsappLinkIds.has(link.id))
    : allCampaignLinks;
  const filteredLinks = useMemo(() => campaignLinks.filter((link) => (!linkId || String(link.id) === linkId) && (!affiliateId || String(link.affiliate?.id) === affiliateId)), [campaignLinks, linkId, affiliateId]);
  const conversions = filteredLinks.flatMap((link) => link.conversionEvents).filter((event) => matchesConversion(event, status, from, to));
  const clicks = filteredLinks.flatMap((link) => link.clickEvents).filter((event) => matchesDate(event.clickedAt, from, to));
  const attendances = conversions.filter((event) => event.attendanceStartedAt || event.whatsappStartedAt).length;
  const leads = conversions.filter((event) => event.leadCreatedAt || event.customerPhone || event.customerDocument).length;
  const converted = conversions.filter((event) => event.convertedInSgp || event.status === "CONVERTED").length;
  const rate = clicks.length ? `${((converted / clicks.length) * 100).toFixed(1)}%` : "0%";

  if (loading) return <main className={styles.page}><div className={styles.surface}><div className={styles.loading}>Carregando dados do backend…</div></div></main>;

  return <main className={styles.page}><div className={styles.surface}>
    <ReportHeader title={titles[kind][0]} subtitle={titles[kind][1]} current={kind === "whatsapp" ? "WhatsApp" : kind === "link" ? "Link Individual" : "Campanha"} />
    {error && <p className={styles.error} role="alert">{error}</p>}
    {kind === "campanha" && selectedCampaign && <ClickInsights links={selectedCampaign.links} />}
    {kind === "link" && <ClickInsights links={campaigns.flatMap((campaign) => campaign.links)} onAffiliateClick={(id) => router.push(`/links-campanhas/relatorios/link?affiliateId=${id}`, { scroll: false })} />}
    {kind === "whatsapp" && <>
      <div className={styles.filters}><div className={styles.filterTitle}><FiFilter aria-hidden="true" /> Filtros</div>
        <label className={styles.field}>Período inicial<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className={styles.field}>Período final<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <Select label="Afiliado" value={affiliateId} onChange={setAffiliateId} options={uniqueAffiliates(campaignLinks)} />
        <Select label="Link" value={linkId} onChange={setLinkId} options={campaignLinks.map((item) => [String(item.id), item.name || item.shortCode])} />
        <Select label="Status da conversão" value={status} onChange={setStatus} options={[["CONVERTED","Convertido"],["LEAD_IDENTIFIED","Lead identificado"],["ATTENDANCE_STARTED","Atendimento iniciado"],["LOST","Perdido"]].map(([a,b]) => [a,b])} />
      </div>
      <div className={styles.kpiGrid}><ReportKpiCard label="Cliques" value={clicks.length} icon={FiMousePointer} /><ReportKpiCard label="Atendimentos WhatsApp" value={attendances} icon={FaWhatsapp} /><ReportKpiCard label="Leads identificados" value={leads} icon={FiUsers} /><ReportKpiCard label="Conversões" value={converted} icon={FiCheckCircle} /><ReportKpiCard label="Taxa de conversão" value={rate} icon={FiTarget} /></div>
      <ClickInsights links={filteredLinks} from={from} to={to} />
      <AffiliatePerformance links={filteredLinks} />
      <LinksPerformance links={filteredLinks} linkNames={whatsappLinkNames} />
      <Customers links={filteredLinks} linkNames={whatsappLinkNames} status={status} from={from} to={to} />
    </>}
    {kind === "link" && <AffiliateLinkReport campaigns={campaigns} />}
    {kind === "campanha" && <CampaignReport campaigns={campaigns} selected={selectedCampaign} value={campaignId} onChange={setCampaignId} />}
  </div></main>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label className={styles.field}>{label}<select value={value} onChange={(e) => onChange(e.target.value)}><option value="">Todos</option>{options.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
function uniqueAffiliates(links: CampaignLink[]) { return [...new Map(links.filter((l) => l.affiliate).map((l) => [String(l.affiliate!.id), [String(l.affiliate!.id), l.affiliate!.name]])).values()]; }
function matchesDate(date: string | null, from: string, to: string) { if (!date) return false; const value = new Date(date).getTime(); return (!from || value >= new Date(`${from}T00:00:00`).getTime()) && (!to || value <= new Date(`${to}T23:59:59`).getTime()); }
function matchesConversion(event: CampaignConversionEvent, status: string, from: string, to: string) { return (!status || event.status === status) && matchesDate(event.convertedAt, from, to); }
function conversionRate(conversions: number, clicks: number) { return clicks ? `${((conversions / clicks) * 100).toFixed(1)}%` : "0%"; }

function ClickInsights({ links, from = "", to = "", onAffiliateClick }: { links: CampaignLink[]; from?: string; to?: string; onAffiliateClick?: (id: number) => void }) {
  const searchParams = useSearchParams();
  const selectedAffiliateId = Number(searchParams.get("affiliateId"));
  const queryFrom = searchParams.get("from") || from;
  const queryTo = searchParams.get("to") || to;
  const queryPeriod = searchParams.get("period") || "30";
  const queryCampaignId = searchParams.get("campaignId") || "";
  const querySearch = (searchParams.get("search") || "").toLocaleLowerCase("pt-BR");
  const scopedLinks = links.filter((link) =>
    (!queryCampaignId || (link as CampaignLink & { campaignId?: number }).campaignId == null || (link as CampaignLink & { campaignId?: number }).campaignId === Number(queryCampaignId)) &&
    (!querySearch || `${link.name || ""} ${link.shortCode} ${link.affiliate?.name || ""}`.toLocaleLowerCase("pt-BR").includes(querySearch)),
  );
  const graphLinks = Number.isInteger(selectedAffiliateId) && selectedAffiliateId > 0
    ? scopedLinks.filter((link) => link.affiliate?.id === selectedAffiliateId)
    : scopedLinks;
  const daily = new Map<string, number>();
  graphLinks.flatMap((link) => link.clickEvents).filter((event) => matchesDate(event.clickedAt, queryFrom, queryTo)).forEach((event) => { const key = event.clickedAt.slice(0, 10); daily.set(key, (daily.get(key) || 0) + 1); });
  const endDate = queryTo ? new Date(`${queryTo}T00:00:00`) : new Date();
  const startDate = queryFrom ? new Date(`${queryFrom}T00:00:00`) : new Date(endDate);
  if (!queryFrom) {
    const days = queryPeriod === "today" ? 1 : queryPeriod === "7" ? 7 : queryPeriod === "30" ? 30 : 30;
    startDate.setDate(endDate.getDate() - (days - 1));
  }
  for (const day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
    const key = day.toISOString().slice(0, 10);
    if (!daily.has(key)) daily.set(key, 0);
  }
  const timeline = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, clicks]) => ({ date, clicks, uniqueClicks: 0, conversions: 0 }));
  const affiliateMap = new Map<number, { id: number; name: string; photoUrl?: string | null; clicks: number }>();
  links.forEach((link) => { if (!link.affiliate) return; const current = affiliateMap.get(link.affiliate.id) || { id: link.affiliate.id, name: link.affiliate.name, photoUrl: link.affiliate.photoUrl, clicks: 0 }; current.clicks += link.clickEvents.filter((event) => matchesDate(event.clickedAt, from, to)).length; affiliateMap.set(current.id, current); });
  const ranking = [...affiliateMap.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 5); const total = Math.max(1, timeline.reduce((sum, row) => sum + row.clicks, 0));
  useEffect(() => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>(`.${styles.clickInsights} .${styles.clickRanking} > div`));
    rows.forEach((element, index) => {
      if (!onAffiliateClick || !ranking[index]) return;
      element.tabIndex = 0;
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", `Filtrar por ${ranking[index].name}`);
      const activate = () => onAffiliateClick(ranking[index].id);
      element.addEventListener("click", activate);
      element.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); } });
      (element as HTMLElement & { cleanup?: () => void }).cleanup = () => element.removeEventListener("click", activate);
    });
    return () => rows.forEach((element) => (element as HTMLElement & { cleanup?: () => void }).cleanup?.());
  }, [ranking, onAffiliateClick]);
  return <div className={styles.clickInsights}><ReportSection title="Tendência de cliques por dia"><Timeline rows={timeline} /></ReportSection><ReportSection title="Ranking de afiliados (por cliques)"><div className={styles.clickRanking}>{ranking.map((row, index) => <div key={row.id}><b>{index + 1}º</b>{row.photoUrl ? <img className={styles.clickRankingAvatar} src={row.photoUrl} alt="" /> : <span className={styles.clickRankingAvatar}>{row.name.slice(0, 1).toUpperCase()}</span>}<span>{row.name}</span><strong>{row.clicks}</strong><i style={{ width: `${(row.clicks / total) * 100}%` }} /></div>)}{!ranking.length && <EmptyState />}</div></ReportSection></div>;
}

function AffiliatePerformance({ links }: { links: CampaignLink[] }) {
  const rows = [...new Map(links.filter((l) => l.affiliate).map((l) => [l.affiliate!.id, l.affiliate!])).values()].map((affiliate) => { const own = links.filter((l) => l.affiliate?.id === affiliate.id); const events = own.flatMap((l) => l.conversionEvents); const clicks = own.reduce((sum,l) => sum + l.clicks,0); const converted = events.filter((e) => e.convertedInSgp || e.status === "CONVERTED").length; return { affiliate, own, clicks, events, converted }; });
  return <ReportSection title="Desempenho dos Afiliados"><Table headers={["Afiliado","Links","Cliques","WhatsApp","Leads","Conversões","Taxa"]} firstColumnLeft>{rows.map((r) => <tr key={r.affiliate.id}><td><AffiliateIdentity name={r.affiliate.name} photoUrl={r.affiliate.photoUrl} /></td><td className={styles.number}>{r.own.length}</td><td className={styles.number}>{r.clicks}</td><td className={styles.number}>{r.events.filter(e=>e.whatsappStartedAt).length}</td><td className={styles.number}>{r.events.filter(e=>e.leadCreatedAt||e.customerPhone).length}</td><td className={styles.number}>{r.converted}</td><td className={styles.number}>{conversionRate(r.converted,r.clicks)}</td></tr>)}</Table>{!rows.length && <EmptyState />}</ReportSection>;
}

function AffiliateIdentity({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
  return <span className={styles.affiliateIdentity}>{photoUrl ? <span className={styles.affiliatePhoto} role="img" aria-label={`Foto de ${name}`} style={{ backgroundImage: `url(${photoUrl})` }} /> : <span className={styles.affiliateInitials} aria-hidden="true">{initials}</span>}<strong>{name}</strong></span>;
}
function LinksPerformance({ links, linkNames }: { links: CampaignLink[]; linkNames: Map<number, string> }) { return <ReportSection title="Desempenho dos Links"><Table headers={["Link","Afiliado","Cliques","Atendimentos","Conversões","Taxa"]} firstColumnLeft>{links.map((l) => { const converted=l.conversionEvents.filter(e=>e.convertedInSgp||e.status==="CONVERTED").length; return <tr key={l.id}><td>{linkNames.get(l.id)||l.name||l.shortCode}</td><td>{l.affiliate?.name||"Sem afiliado"}</td><td className={styles.number}>{l.clicks}</td><td className={styles.number}>{l.conversionEvents.filter(e=>e.attendanceStartedAt||e.whatsappStartedAt).length}</td><td className={styles.number}>{converted}</td><td className={styles.number}>{conversionRate(converted,l.clicks)}</td></tr>; })}</Table>{!links.length&&<EmptyState />}</ReportSection>; }
function Customers({ links, linkNames, status, from, to }: { links: CampaignLink[]; linkNames: Map<number, string>; status: string; from: string; to: string }) { const rows=links.flatMap(l=>l.conversionEvents.filter(e=>matchesConversion(e,status,from,to)).map(e=>({l,e}))); return <ReportSection title="Clientes alcançados" description="Dados atribuídos pelo WhatsApp/Chatmix e pelas conversões disponíveis no backend."><Table headers={["Cliente","Telefone","Afiliado","Link","Registrado em","Atendimento","Conversão"]}>{rows.map(({l,e})=><tr key={`${l.id}-${e.id}`}><td>{e.customerName||"Não identificado"}</td><td>{e.customerPhone||"—"}</td><td>{l.affiliate?.name||"—"}</td><td>{linkNames.get(l.id)||l.name||l.shortCode}</td><td>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(e.convertedAt))}</td><td><span className={styles.statusPill}>{e.attendanceStartedAt||e.whatsappStartedAt?"Iniciado":"Não identificado"}</span></td><td><span className={styles.statusPill}>{e.statusName||e.status}</span></td></tr>)}</Table>{!rows.length&&<EmptyState text="Ainda não há clientes atribuídos aos filtros selecionados." />}</ReportSection>; }
function Table({ headers, children, firstColumnLeft = false }: { headers: string[]; children: React.ReactNode; firstColumnLeft?: boolean }) { return <div className={styles.tableWrap}><table className={`${styles.table} ${firstColumnLeft ? styles.tableFirstColumnLeft : ""}`}><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }

function CampaignReport({ campaigns, selected, value, onChange }: { campaigns:Campaign[]; selected?:Campaign; value:string; onChange:(v:string)=>void }) {
  if(!selected) return <><div className={styles.filters}><div className={styles.filterTitle}><FiBarChart2 aria-hidden="true"/> Selecione uma campanha</div><Select label="Campanha" value={value} onChange={onChange} options={campaigns.map(c=>[String(c.id),c.name])}/></div><EmptyState text="Selecione uma campanha acima para visualizar o dashboard."/></>;
  const ranked=[...new Map(selected.links.filter(l=>l.affiliate).map(l=>[l.affiliate!.id,l.affiliate!])).values()].map(a=>{const own=selected.links.filter(l=>l.affiliate?.id===a.id);return {a,clicks:own.reduce((s,l)=>s+l.clicks,0),conversions:own.reduce((s,l)=>s+l.conversions,0)}}).sort((a,b)=>b.conversions-a.conversions);
  return <><div className={styles.filters}><div className={styles.filterTitle}><FiBarChart2 aria-hidden="true"/> Selecione uma campanha</div><Select label="Campanha" value={value} onChange={onChange} options={campaigns.map(c=>[String(c.id),c.name])}/></div><div className={styles.kpiGrid}><ReportKpiCard label="Afiliados participantes" value={selected.totalAffiliates} icon={FiUsers}/><ReportKpiCard label="Links ativos" value={selected.totalLinks} icon={FiLink}/><ReportKpiCard label="Cliques" value={selected.totalClicks} icon={FiMousePointer}/><ReportKpiCard label="Atendimentos" value={selected.links.flatMap(l=>l.conversionEvents).filter(e=>e.attendanceStartedAt||e.whatsappStartedAt).length} icon={FaWhatsapp}/><ReportKpiCard label="Leads" value={selected.links.flatMap(l=>l.conversionEvents).filter(e=>e.leadCreatedAt||e.customerPhone).length} icon={FiUsers}/><ReportKpiCard label="Conversões" value={selected.totalConversions} icon={FiCheckCircle}/><ReportKpiCard label="Taxa de conversão" value={conversionRate(selected.totalConversions,selected.totalClicks)} icon={FiTarget}/></div><ReportSection title="Ranking de Afiliados"><div className={styles.rankList}>{ranked.slice(0,10).map((r,i)=><div className={styles.rankItem} key={r.a.id}><div className={styles.rankPosition}>{i+1}º</div><strong>{r.a.name}</strong><span>{r.conversions} conversões</span></div>)}</div>{!ranked.length&&<EmptyState/>}</ReportSection><ReportSection title="Comparativo dos Afiliados"><Table headers={["Afiliado","Links","Cliques","Conversões","Taxa"]}>{ranked.map(r=><tr key={r.a.id}><td>{r.a.name}</td><td className={styles.number}>{selected.links.filter(l=>l.affiliate?.id===r.a.id).length}</td><td className={styles.number}>{r.clicks}</td><td className={styles.number}>{r.conversions}</td><td className={styles.number}>{conversionRate(r.conversions,r.clicks)}</td></tr>)}</Table></ReportSection><ReportSection title="Desempenho dos Links"><LinksPerformanceTable links={[...selected.links].sort((a,b)=>b.conversions-a.conversions)}/></ReportSection></>;
}
function LinksPerformanceTable({links}:{links:CampaignLink[]}) { return <Table headers={["Link","Afiliado","Cliques","Conversões","Taxa"]}>{links.map(l=><tr key={l.id}><td>{l.name||l.shortCode}</td><td>{l.affiliate?.name||"—"}</td><td className={styles.number}>{l.clicks}</td><td className={styles.number}>{l.conversions}</td><td className={styles.number}>{conversionRate(l.conversions,l.clicks)}</td></tr>)}</Table>; }

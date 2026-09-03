"use client";

import { useEffect, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiBarChart2, FiCheckCircle, FiFilter, FiLink, FiMousePointer, FiTarget, FiUsers } from "react-icons/fi";
import { Campaign, CampaignConversionEvent, CampaignLink, getApiErrorMessage, listarCampanhas, listarLinksWhatsApp, WhatsAppLinkItem } from "@/lib/api";
import { EmptyState, ReportHeader, ReportKpiCard, ReportSection, reportStyles as styles } from "./ReportsUi";
import AffiliateLinkReport from "./AffiliateLinkReport";

type ReportKind = "whatsapp" | "link" | "campanha";
const titles = {
  whatsapp: ["Relatório do WhatsApp", "Acompanhe atendimentos e resultados atribuídos aos links de divulgação no WhatsApp."],
  link: ["Relatório de Link Individual", "Analise em detalhe o desempenho de um link específico de divulgação."],
  campanha: ["Relatório de Campanha", "Compare afiliados e links em uma visão consolidada da campanha."],
} as const;

export default function ReportDashboard({ kind }: { kind: ReportKind }) {
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

  useEffect(() => {
    Promise.all([listarCampanhas(), kind === "whatsapp" ? listarLinksWhatsApp() : Promise.resolve([])])
      .then(([campaignData, whatsappLinkData]) => { setCampaigns(campaignData); setWhatsappLinks(whatsappLinkData); setError(""); })
      .catch((reason) => setError(getApiErrorMessage(reason, "Não foi possível carregar os dados dos relatórios.")))
      .finally(() => setLoading(false));
  }, []);

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
    {kind === "whatsapp" && <>
      <div className={styles.filters}><div className={styles.filterTitle}><FiFilter aria-hidden="true" /> Filtros</div>
        <label className={styles.field}>Período inicial<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className={styles.field}>Período final<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <Select label="Afiliado" value={affiliateId} onChange={setAffiliateId} options={uniqueAffiliates(campaignLinks)} />
        <Select label="Link" value={linkId} onChange={setLinkId} options={campaignLinks.map((item) => [String(item.id), item.name || item.shortCode])} />
        <Select label="Status da conversão" value={status} onChange={setStatus} options={[["CONVERTED","Convertido"],["LEAD_IDENTIFIED","Lead identificado"],["ATTENDANCE_STARTED","Atendimento iniciado"],["LOST","Perdido"]].map(([a,b]) => [a,b])} />
      </div>
      <div className={styles.kpiGrid}><ReportKpiCard label="Cliques" value={clicks.length} icon={FiMousePointer} /><ReportKpiCard label="Atendimentos WhatsApp" value={attendances} icon={FaWhatsapp} /><ReportKpiCard label="Leads identificados" value={leads} icon={FiUsers} /><ReportKpiCard label="Conversões" value={converted} icon={FiCheckCircle} /><ReportKpiCard label="Taxa de conversão" value={rate} icon={FiTarget} /></div>
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

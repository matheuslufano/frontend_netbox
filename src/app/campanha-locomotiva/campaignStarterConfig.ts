import type { CampaignConfig, Registration } from "./types";

const starterTimes = {
  lunch: ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00"],
  dinner: ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:30", "22:00", "22:30"],
};

function campaignDateRange() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Araguaina",
  }).format();
  const firstDay = Date.parse(`${today}T12:00:00Z`) + 86400000;
  return Array.from({ length: 30 }, (_, index) =>
    new Date(firstDay + index * 86400000).toISOString().slice(0, 10),
  );
}

export function starterConfiguration(
  draft: CampaignConfig,
  registrations: Registration[] = [],
) {
  const dailyCapacity = Math.max(1, Number(draft.dailyCapacity) || 1);
  const hasCurrentFutureSlot = draft.dates.some((date) =>
    [...draft.lunch, ...draft.dinner].some(
      (time) =>
        Date.parse(`${date}T${time}:00-03:00`) >=
        Date.now(),
    ),
  );
  const hasActiveReservation = registrations.some(
    (registration) =>
      ["PENDING", "CONFIRMED", "ATTENDED", "ABSENT"].includes(
        registration.status,
      ) && draft.dates.includes(registration.date),
  );
  const dates = hasCurrentFutureSlot || hasActiveReservation
    ? draft.dates
    : campaignDateRange();
  const lastDate = dates.at(-1)!;
  const imageExpiry = new Date(
    Date.parse(`${lastDate}T12:00:00Z`) + 365 * 86400000,
  )
    .toISOString()
    .slice(0, 10);
  const voucherAmount = Number(draft.voucherAmount || 200);
  const capacityRule = `Cada data comporta até ${dailyCapacity} influenciador${dailyCapacity === 1 ? "" : "es"}.`;
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(voucherAmount);
  const defaults: Record<string, string | number | string[]> = {
    campaignName: "Campanha de influenciadores Locomotiva",
    campaignDescription: "Visitas de criadores de conte\u00fado para apresentar a experi\u00eancia do restaurante Locomotiva.",
    restaurantName: "Locomotiva",
    dailyCapacity,
    address: "Avenida Santos Dumont, rotat\u00f3ria do F\u00f3rum, Setor Milena, Para\u00edso do Tocantins/TO",
    contact: "E-mail: locomotivar26@gmail.com",
    voucherAmount,
    voucher: `Voucher individual de ${currency} para consumo no restaurante Locomotiva, v\u00e1lido somente na data e no hor\u00e1rio confirmados. N\u00e3o pode ser convertido em dinheiro.`,
    companions: "A participa\u00e7\u00e3o de acompanhantes deve ser combinada previamente com a equipe do restaurante e registrada na confirma\u00e7\u00e3o.",
    excess: `O consumo acima de ${currency} fica sob responsabilidade do participante e deve ser pago diretamente ao restaurante.`,
    balance: "O valor n\u00e3o consumido n\u00e3o pode ser transferido para outra data nem convertido em dinheiro.",
    cancellation: "Solicite cancelamento ou reagendamento pelo canal de atendimento assim que necess\u00e1rio. A altera\u00e7\u00e3o depende da confirma\u00e7\u00e3o do restaurante.",
    publication: "2 Stories de aquecimento antes da visita. No dia da visita: 4 Stories OU 1 Reels de 60 segundos, mostrando a experi\u00eancia no restaurante.\nPrazo para publicar ap\u00f3s a visita (horas): 24\nPerman\u00eancia dos Stories (horas): 24\nPerman\u00eancia do Reels (dias): 24\nPrazo para enviar comprovantes (horas): 24",
    tags: "@locomotivarestaurante",
    conditions: `A visita deve ser agendada pelo formul\u00e1rio e s\u00f3 fica confirmada ap\u00f3s aprova\u00e7\u00e3o expressa do restaurante por e-mail. ${capacityRule}\n\nO participante aprovado recebe um voucher de ${currency}, v\u00e1lido na data e no hor\u00e1rio confirmados. Valores excedentes s\u00e3o pagos pelo participante. Regras para acompanhantes devem constar na confirma\u00e7\u00e3o.\n\nA entrega consiste em 2 Stories antes da visita e, durante a visita, 4 Stories ou 1 Reels de 60 segundos. Marque @locomotivarestaurante e envie os links das publica\u00e7\u00f5es dentro do prazo informado.\n\nCancelamentos e pedidos de reagendamento devem ser enviados pelo canal de atendimento. Uma nova data depende da disponibilidade e da confirma\u00e7\u00e3o do restaurante.`,
    imageTerm: "O participante autoriza, de forma livre e espec\u00edfica, o compartilhamento org\u00e2nico das imagens e v\u00eddeos produzidos durante a visita nos canais indicados neste cadastro, para divulgar a experi\u00eancia e o restaurante Locomotiva. A autoriza\u00e7\u00e3o n\u00e3o inclui an\u00fancios pagos, cess\u00e3o a terceiros ou uso fora da finalidade descrita. Ajustes t\u00e9cnicos n\u00e3o podem alterar o contexto do conte\u00fado. O participante pode solicitar a interrup\u00e7\u00e3o de usos futuros pelo canal de atendimento.",
    privacy: "AVISO DE PRIVACIDADE\n\nO restaurante Locomotiva utiliza os dados informados no cadastro para analisar a participa\u00e7\u00e3o, organizar a visita, confirmar a reserva, comunicar regras da campanha e verificar as entregas combinadas.\n\nPodem ser tratados nome, CPF, e-mail, telefone, cidade, perfil social e imagem enviada voluntariamente. O CPF \u00e9 protegido e exibido de forma mascarada no painel. Os dados n\u00e3o s\u00e3o vendidos e o acesso \u00e9 limitado a pessoas autorizadas.\n\nOs dados s\u00e3o mantidos pelo tempo necess\u00e1rio para administrar a campanha e cumprir obriga\u00e7\u00f5es legais. Para solicitar acesso, corre\u00e7\u00e3o ou esclarecimentos sobre seus dados, use o canal de atendimento informado nesta p\u00e1gina. O tratamento observa a Lei n\u00ba 13.709/2018 (LGPD).",
    imageChannels: "Canal autorizado: Instagram org\u00e2nico\nPerfil autorizado: @locomotivarestaurante",
    imagePurpose: "Finalidade: divulgar organicamente a experi\u00eancia e o restaurante Locomotiva nos canais e perfis indicados neste termo.",
    imageDuration: `Data de t\u00e9rmino da autoriza\u00e7\u00e3o: ${imageExpiry}`,
    imageEditing: "Ajustes t\u00e9cnicos de formato, corte e legendas, sem alterar o sentido, o contexto ou a integridade do participante.",
    imagePromotion: "An\u00fancios pagos: N\u00e3o permitido",
    dates,
    lunch: draft.lunch.length ? draft.lunch : starterTimes.lunch,
    dinner: draft.dinner.length ? draft.dinner : starterTimes.dinner,
  };
  const next = { ...draft };
  for (const [key, value] of Object.entries(defaults)) {
    if (key === "dates") continue;
    if (Array.isArray(value)) {
      if (!(next[key] as string[] | undefined)?.length) next[key] = value;
    } else if (typeof value === "number") {
      if (!Number(next[key])) next[key] = value;
    } else if (!String(next[key] ?? "").trim()) {
      next[key] = value;
    }
  }
  next.conditions = String(next.conditions ?? "").replace(
    /Cada data comporta (?:um participante|at[e\u00e9] \d+ influenciador(?:es)?)\./,
    capacityRule,
  );
  const existingImageExpiry =
    /^Data de t\u00e9rmino da autoriza\u00e7\u00e3o: (\d{4}-\d{2}-\d{2})$/.exec(
      String(next.imageDuration ?? ""),
    )?.[1];
  if (existingImageExpiry && dates.at(-1) && existingImageExpiry < dates.at(-1)!)
    next.imageDuration = `Data de t\u00e9rmino da autoriza\u00e7\u00e3o: ${imageExpiry}`;
  next.dates = dates;
  return next;
}

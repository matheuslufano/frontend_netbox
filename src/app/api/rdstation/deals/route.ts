import {
  addQueryParam,
  getListPayload,
  isRecord,
  jsonError,
  RdRecord,
  rdRequest,
  readNumber,
  readRecord,
  readRecordArray,
  readString,
} from "../_utils";

function normalizeStatus(value: string) {
  const status = value.trim().toLowerCase();

  if (["won", "closed", "vendida", "venda"].includes(status)) {
    return "won";
  }

  if (["lost", "perdida", "nao_vendido", "não vendido"].includes(status)) {
    return "lost";
  }

  if (["new", "nova"].includes(status)) {
    return "new";
  }

  return "ongoing";
}

function normalizeDeal(record: RdRecord) {
  const stage = readRecord(record, ["stage", "deal_stage"]);
  const pipeline = readRecord(record, ["pipeline", "deal_pipeline"]);
  const contact =
    readRecord(record, ["contact"]) ||
    readRecordArray(record, ["contacts"])[0] ||
    null;
  const owner = readRecord(record, ["owner", "user"]);

  return {
    id: readString(record, ["id", "_id", "uuid"]),
    name:
      readString(record, ["name", "title"]) ||
      readString(contact ?? {}, ["name", "full_name"]) ||
      "Negociacao sem nome",
    customerName:
      readString(contact ?? {}, ["name", "full_name"]) ||
      readString(record, ["customer_name", "name", "title"]),
    phone: readString(contact ?? {}, [
      "phone",
      "mobile_phone",
      "phones.0.phone",
      "phones.0.number",
    ]),
    email: readString(contact ?? {}, [
      "email",
      "emails.0.email",
      "emails.0.address",
    ]),
    status: normalizeStatus(
      readString(record, ["status", "deal_status", "state"])
    ),
    value: readNumber(record, ["value", "amount", "total_value", "deal_value"]),
    source:
      readString(record, ["source", "source_name", "campaign_name"]) ||
      "RD Station CRM",
    affiliate:
      readString(record, ["affiliate", "affiliate_name", "referrer"]) ||
      readString(owner ?? {}, ["name"]) ||
      "RD Station CRM",
    activity:
      readString(record, [
        "next_task",
        "last_activity",
        "last_activity.name",
      ]) || "Criar tarefa",
    updatedAt:
      readString(record, ["updated_at", "updatedAt", "created_at"]) ||
      new Date().toISOString(),
    stageId:
      readString(record, ["stage_id", "deal_stage_id"]) ||
      readString(stage ?? {}, ["id"]),
    stageName: readString(stage ?? {}, ["name"]) || "Sem etapa",
    pipelineId:
      readString(record, ["pipeline_id", "deal_pipeline_id"]) ||
      readString(pipeline ?? {}, ["id"]),
    raw: record,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = new URLSearchParams();
  const pipelineId =
    url.searchParams.get("pipelineId") || process.env.RD_STATION_PIPELINE_ID;
  const stageId = url.searchParams.get("stageId");
  const status = url.searchParams.get("status");
  const page = url.searchParams.get("page");
  const limit = url.searchParams.get("limit") || "100";
  const search = url.searchParams.get("q");
  const filters = [];

  if (pipelineId) {
    filters.push(`pipeline_id:${pipelineId}`);
  }

  if (stageId) {
    filters.push(`stage_id:${stageId}`);
  }

  if (status && status !== "all") {
    filters.push(`status:${status}`);
  }

  if (filters.length > 0) {
    params.set("filter", filters.join(" AND "));
  }

  addQueryParam(params, "page[number]", page || "1");
  addQueryParam(params, "page[size]", limit);

  if (search) {
    filters.push(`name~${search}`);
    params.set("filter", filters.join(" AND "));
  }

  params.set("sort[updated_at]", "desc");
  const query = params.toString();
  const result = await rdRequest(`/deals${query ? `?${query}` : ""}`);

  if (!result.configured) {
    return jsonError(
      "Defina RD_STATION_ACCESS_TOKEN no ambiente do servidor.",
      503
    );
  }

  if (!result.response?.ok) {
    return jsonError(
      "Nao foi possivel listar negociacoes no RD Station.",
      result.response?.status || 500,
      result.body
    );
  }

  return Response.json({
    deals: getListPayload(result.body).map(normalizeDeal),
    raw: result.body,
  });
}

export async function POST(request: Request) {
  const input = await request.json().catch(() => null);

  if (!isRecord(input)) {
    return jsonError("Envie os dados da negociacao em JSON.", 400);
  }

  const name = readString(input, ["name"]);
  const stageId =
    readString(input, ["stageId", "stage_id"]) ||
    process.env.RD_STATION_DEFAULT_STAGE_ID ||
    process.env.RD_STATION_STAGE_ID ||
    "";
  const pipelineId =
    readString(input, ["pipelineId", "pipeline_id"]) ||
    process.env.RD_STATION_PIPELINE_ID ||
    "";
  const value = readNumber(input, ["value", "amount"]);
  const customerName = readString(input, ["customerName", "contactName"]);
  const email = readString(input, ["email"]);
  const phone = readString(input, ["phone"]);
  const source = readString(input, ["source"]);
  const campaign = readString(input, ["campaign"]);
  const affiliate = readString(input, ["affiliate"]);
  const notes = readString(input, ["notes"]);

  if (!name) {
    return jsonError("Informe o nome da negociacao.", 400);
  }

  const data: RdRecord = {
    name,
    status: "ongoing",
  };

  if (stageId) {
    data.stage_id = stageId;
  }

  if (pipelineId) {
    data.pipeline_id = pipelineId;
  }

  if (value > 0) {
    data.value = value;
  }

  if (source) {
    data.source = source;
  }

  if (campaign) {
    data.campaign_name = campaign;
  }

  if (affiliate) {
    data.affiliate = affiliate;
  }

  if (notes) {
    data.description = notes;
  }

  const contactId = await createContactForDeal({
    name: customerName || name,
    email,
    phone,
  });

  if (contactId) {
    data.contact_id = contactId;
  }

  const result = await rdRequest("/deals", {
    method: "POST",
    body: JSON.stringify({
      data,
    }),
  });

  if (!result.configured) {
    return jsonError(
      "Defina RD_STATION_ACCESS_TOKEN no ambiente do servidor.",
      503
    );
  }

  if (!result.response?.ok) {
    return jsonError(
      "Nao foi possivel criar a negociacao no RD Station.",
      result.response?.status || 500,
      result.body
    );
  }

  return Response.json(
    {
      deal: isRecord(result.body)
        ? normalizeDeal(isRecord(result.body.data) ? result.body.data : result.body)
        : null,
      raw: result.body,
    },
    {
      status: 201,
    }
  );
}

async function createContactForDeal(input: {
  name: string;
  email: string;
  phone: string;
}) {
  if (!input.name || (!input.email && !input.phone)) {
    return "";
  }

  const result = await rdRequest("/contacts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        name: input.name,
        ...(input.email
          ? {
              emails: [
                {
                  email: input.email.toLowerCase(),
                },
              ],
            }
          : {}),
        ...(input.phone
          ? {
              phones: [
                {
                  phone: input.phone.replace(/\D/g, ""),
                  type: "mobile",
                },
              ],
            }
          : {}),
        legal_bases: [
          {
            category: "communications",
            type: "consent",
            status: "granted",
          },
        ],
      },
    }),
  });

  if (!result.configured || !result.response?.ok || !isRecord(result.body)) {
    return "";
  }

  if (typeof result.body.id === "string") {
    return result.body.id;
  }

  const data = isRecord(result.body.data) ? result.body.data : null;

  return readString(data ?? {}, ["id"]);
}

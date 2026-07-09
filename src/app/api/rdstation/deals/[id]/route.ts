import {
  isRecord,
  jsonError,
  RdRecord,
  rdRequest,
  readNumber,
  readString,
} from "../../_utils";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const input = await request.json().catch(() => null);

  if (!isRecord(input)) {
    return jsonError("Envie os dados da negociacao em JSON.", 400);
  }

  const data = normalizeDealUpdate(input);

  const result = await rdRequest(`/deals/${encodeURIComponent(id)}`, {
    method: "PUT",
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
      "Nao foi possivel atualizar a negociacao no RD Station.",
      result.response?.status || 500,
      result.body
    );
  }

  return Response.json({
    deal: result.body,
  });
}

function normalizeDealUpdate(input: RdRecord) {
  const data: RdRecord = {
    ...input,
  };
  const stageId = readString(input, ["stageId", "stage_id", "deal_stage_id"]);
  const pipelineId = readString(input, [
    "pipelineId",
    "pipeline_id",
    "deal_pipeline_id",
  ]);
  const customerName = readString(input, ["customerName", "name"]);
  const monthlyValue = readNumber(input, ["monthlyValue", "value", "amount"]);

  delete data.stageId;
  delete data.pipelineId;
  delete data.customerName;
  delete data.monthlyValue;
  delete data.deal_stage_id;
  delete data.deal_pipeline_id;

  if (stageId) {
    data.stage_id = stageId;
  }

  if (pipelineId) {
    data.pipeline_id = pipelineId;
  }

  if (customerName) {
    data.name = customerName;
  }

  if (monthlyValue > 0) {
    data.value = monthlyValue;
  }

  return data;
}

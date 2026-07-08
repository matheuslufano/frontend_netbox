import {
  getListPayload,
  jsonError,
  RdRecord,
  rdRequest,
  readBoolean,
  readNumber,
  readRecordArray,
  readString,
} from "../_utils";

function readStages(record: RdRecord) {
  return readRecordArray(record, [
    "stages",
    "deal_stages",
    "pipeline_stages",
  ]).map((stage, index) => ({
    id: readString(stage, ["id", "_id", "uuid"]) || `stage-${index + 1}`,
    name: readString(stage, ["name", "title"]) || "Etapa sem nome",
    position: readNumber(stage, ["position", "order", "order_index"]),
    isFinal: readBoolean(stage, ["is_final", "final"]),
    isWonStage: readBoolean(stage, ["is_won", "won", "win"]),
    isLostStage: readBoolean(stage, ["is_lost", "lost"]),
    raw: stage,
  }));
}

function normalizePipeline(record: RdRecord) {
  return {
    id: readString(record, ["id", "_id", "uuid"]),
    name: readString(record, ["name", "title"]) || "Funil sem nome",
    stages: readStages(record),
    raw: record,
  };
}

export async function GET() {
  const result = await rdRequest("/pipelines");

  if (!result.configured) {
    return jsonError(
      "Defina RD_STATION_ACCESS_TOKEN no ambiente do servidor.",
      503
    );
  }

  if (!result.response?.ok) {
    return jsonError(
      "Nao foi possivel listar funis no RD Station.",
      result.response?.status || 500,
      result.body
    );
  }

  const pipelines = getListPayload(result.body).map(normalizePipeline);

  return Response.json({
    pipelines,
    raw: result.body,
  });
}

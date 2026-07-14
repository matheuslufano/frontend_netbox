import {
  getListPayload,
  isRdStationCrmV1,
  jsonError,
  RdRecord,
  rdRequest,
  readBoolean,
  readNumber,
  readRecordArray,
  readString,
} from "../_utils";

function readStages(record: RdRecord) {
  return normalizeStages(
    readRecordArray(record, [
      "stages",
      "deal_stages",
      "pipeline_stages",
      "deal_pipeline_stages",
    ])
  );
}

function normalizeStages(stages: RdRecord[]) {
  return stages.map((stage, index) => ({
    id: readString(stage, ["id", "_id", "uuid"]) || `stage-${index + 1}`,
    name: readString(stage, ["name", "title"]) || "Etapa sem nome",
    position: readNumber(stage, ["order", "position", "order_index"]),
    isFinal: readBoolean(stage, ["is_final", "final"]),
    isWonStage: readBoolean(stage, ["is_won", "won", "win"]),
    isLostStage: readBoolean(stage, ["is_lost", "lost"]),
    raw: stage,
  }));
}

function normalizePipeline(record: RdRecord, stages = readStages(record)) {
  return {
    id: readString(record, ["id", "_id", "uuid"]),
    name: readString(record, ["name", "title"]) || "Funil sem nome",
    stages,
    raw: record,
  };
}

export async function GET() {
  const usesV1 = isRdStationCrmV1();
  const result = await rdRequest(usesV1 ? "/deal_pipelines" : "/pipelines");

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

  const pipelineRecords = getListPayload(result.body);

  if (usesV1) {
    return Response.json({
      pipelines: pipelineRecords.map((record) => normalizePipeline(record)),
      raw: result.body,
    });
  }

  const pipelines = [];

  for (const record of pipelineRecords) {
    const pipelineId = readString(record, ["id", "_id", "uuid"]);

    if (!pipelineId) {
      pipelines.push(normalizePipeline(record));
      continue;
    }

    const stageResult = await rdRequest(
      `/pipelines/${encodeURIComponent(pipelineId)}/stages?page[number]=1&page[size]=100&sort[order]=asc`
    );

    if (!stageResult.response?.ok) {
      return jsonError(
        "Nao foi possivel listar as etapas do funil no RD Station.",
        stageResult.response?.status || 500,
        {
          pipelineId,
          response: stageResult.body,
        }
      );
    }

    pipelines.push(
      normalizePipeline(record, normalizeStages(getListPayload(stageResult.body)))
    );
  }

  return Response.json({
    pipelines,
    raw: result.body,
  });
}

import {
  getRdStationAccessToken,
  getRdStationBaseUrl,
  readJson,
} from "../_utils";

type CreateRdStationContactRequest = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  jobTitle?: unknown;
  consent?: unknown;
};

type RdStationContactData = {
  name: string;
  job_title?: string;
  emails: Array<{
    email: string;
  }>;
  phones?: Array<{
    phone: string;
    type: "mobile";
  }>;
  legal_bases?: Array<{
    category: "communications";
    type: "consent";
    status: "granted";
  }>;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function buildPayload(input: CreateRdStationContactRequest) {
  const name = readString(input.name);
  const email = readString(input.email).toLowerCase();
  const phone = normalizePhone(readString(input.phone));
  const jobTitle = readString(input.jobTitle);
  const consent = input.consent !== false;

  if (!name) {
    return {
      error: "Informe o nome do contato.",
    };
  }

  if (!email) {
    return {
      error: "Informe o email do contato.",
    };
  }

  const data: RdStationContactData = {
    name,
    emails: [
      {
        email,
      },
    ],
  };

  if (jobTitle) {
    data.job_title = jobTitle;
  }

  if (phone) {
    data.phones = [
      {
        phone,
        type: "mobile",
      },
    ];
  }

  if (consent) {
    data.legal_bases = [
      {
        category: "communications",
        type: "consent",
        status: "granted",
      },
    ];
  }

  return {
    payload: {
      data,
    },
  };
}

export async function POST(request: Request) {
  const accessToken = getRdStationAccessToken();

  if (!accessToken) {
    return Response.json(
      {
        error: "RD Station nao configurado.",
        message:
          "Defina RD_STATION_ACCESS_TOKEN no ambiente do servidor para criar contatos.",
      },
      {
        status: 503,
      }
    );
  }

  const input = (await request.json().catch(() => null)) as
    | CreateRdStationContactRequest
    | null;

  if (!input || typeof input !== "object") {
    return Response.json(
      {
        error: "Payload invalido.",
        message: "Envie os dados do contato em JSON.",
      },
      {
        status: 400,
      }
    );
  }

  const result = buildPayload(input);

  if ("error" in result) {
    return Response.json(
      {
        error: result.error,
        message: result.error,
      },
      {
        status: 400,
      }
    );
  }

  const response = await fetch(`${getRdStationBaseUrl()}/contacts`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(result.payload),
  });
  const body = (await readJson(response)) as Record<string, unknown> | null;

  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const message =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : "O RD Station recusou a criacao do contato.";

    return Response.json(
      {
        error: "Falha no RD Station.",
        message,
        status: response.status,
        retryAfter,
        details: body,
      },
      {
        status: response.status,
      }
    );
  }

  return Response.json(
    {
      message: "Contato criado no RD Station CRM.",
      contactId: typeof body?.id === "string" ? body.id : null,
      contact: body,
    },
    {
      status: 201,
    }
  );
}

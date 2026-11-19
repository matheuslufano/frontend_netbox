export type CampaignConfig = {
  published: boolean;
  revision: number;
  dates: string[];
  lunch: string[];
  dinner: string[];
  minimumHours: number;
} & Record<string, string | number | boolean | string[]>;
export const requiredDocumentApprovals = ["imageTerm", "privacy"];
export type Availability = {
  date: string;
  state: string;
  times: { lunch: string[]; dinner: string[] };
};
export type Registration = {
  id: string;
  name: string;
  instagram: string;
  profileUrl: string;
  photo: string | null;
  photoState: string;
  city: string;
  uf: string;
  email: string;
  phone: string;
  cpf: string;
  cpfFull?: string;
  createdAt?: string;
  date: string;
  time: string;
  period: string;
  modality: string;
  status: string;
  revision: number;
  notes: string;
  content: { links: string[]; checked: boolean; notes: string };
  acceptance: {
    at: string;
    revision: number;
    conditions: string;
    imageTerm: string;
    privacy: string;
    terms: CampaignConfig;
  };
  history?: {
    id: string;
    actor: string;
    action: string;
    reason: string;
    at: string;
  }[];
  emails?: {
    id: string;
    kind: string;
    state: string;
    attempts: number;
    lastError: string | null;
    sentAt: string | null;
  }[];
};
export type Invite = {
  id: string;
  name: string;
  instagram: string;
  state: string;
  sentAt?: string;
};
export type Dashboard = {
  settings?: {
    draft: CampaignConfig;
    version: number;
    updatedAt: string;
    reviews: Record<string, { status: "draft" | "review" | "approved"; version: number; by?: string; at?: string }>;
  };
  config: CampaignConfig;
  availability: Availability[];
  registrations: Registration[];
  invites: Invite[];
  missing: string[];
  canReadCpf: boolean;
  mailConfigured: boolean;
  localTestEnabled?: boolean;
};
export type SettingsOperation = "save" | "review" | "approve" | "publish" | "close";
export const statusLabels: Record<string, string> = {
  PENDING: "Em análise",
  CONFIRMED: "Confirmada",
  REJECTED: "Recusada",
  CANCELLED: "Cancelada",
  ATTENDED: "Compareceu",
  ABSENT: "Não compareceu",
  AVAILABLE: "Disponível",
  CLOSED: "Prazo encerrado / não oferecida",
};
export const configLabels: Record<string, string> = {
  address: "Endereço do restaurante",
  contact: "Contato da campanha",
  voucher: "Condições de consumo do voucher",
  companions: "Regras para acompanhantes",
  excess: "Pagamento do excedente",
  balance: "Saldo restante do voucher",
  cancellation: "Prazo, procedimento de cancelamento e ausência",
  publication: "Prazo e orientações das publicações",
  tags: "Perfis que devem ser marcados",
  conditions: "Condições completas de participação aprovadas",
  imageTerm: "Termo aprovado — imagem, voz e nome quando aplicáveis",
  privacy: "Aviso de privacidade aprovado",
  approvedBy: "Responsável que aprovou os documentos",
  imageChannels: "Canais autorizados para uso de imagem",
  imagePurpose: "Finalidade do uso de imagem",
  imageDuration: "Prazo da autorização de imagem",
  imageEditing: "Limites de edição",
  imagePromotion: "Permissão e limites de impulsionamento",
};

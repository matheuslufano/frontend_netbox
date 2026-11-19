# Gestão de parcerias

## Rotas e arquivos

- `/integracoes`: cartão Parcerias abre `/integracoes/parcerias`.
- `page.tsx`: seleção de parceiros com cartão clicável e logo oficial. Atualmente exibe apenas a Locomotiva, sem consultar dados administrativos antes da seleção.
- `/integracoes/parcerias/locomotiva` (`locomotiva/page.tsx`): painel completo da Locomotiva, com visão geral, reservas, calendário, convites e configurações.
- `public/parcerias/locomotiva-logo.png`: cópia da logo oficial do projeto Locomotiva, com proporções preservadas.
- `partnerships.module.css`: estilos exclusivos da central, grade responsiva, foco visível e redução de movimento.
- `/campanha-locomotiva`: endereço anterior, servido pelo mesmo componente `LocomotivaCampaignDashboard.tsx`. Os estilos do painel ficam em `campaign.module.css`.
- `?secao=overview`, `registrations`, `calendar`, `invites`, `settings` e `activation`: seleção direta de seção nas duas rotas.

## Origem das reservas

A ficha apresenta os dados pessoais da inscrição, a visita e o histórico de aceites. O backend entrega o CPF completo já na abertura para administradores e registra a consulta na auditoria. Os cartões da lista e a ficha de gestores exibem o CPF mascarado.

O formulário público envia solicitações para `POST /locomotiva/registrations`. O backend salva os registros no PostgreSQL e o painel consulta `GET /admin/locomotiva`. A lista inclui todos os estados, inclusive recusadas e canceladas. A consulta automática ocorre a cada 30 segundos com a página visível, fora das configurações e da edição de um registro. O botão Atualizar faz uma consulta imediata. Reservas recebidas por telefone, WhatsApp ou outro sistema dependem de uma integração própria.

## Configuração e publicação

O regulamento precisa estar preenchido para leitura e aceite no site. Sua aprovação administrativa é opcional para publicar. O termo de uso de imagem e o aviso de privacidade exigem aprovação.

Com `LOCOMOTIVA_LOCAL_TEST=true` no ambiente do backend de desenvolvimento e PostgreSQL no loopback, a aba permite ativação de teste com uma seleção de datas, documentos demonstrativos e horário de 11h30 caso nenhum tenha sido cadastrado. Os registros de teste ficam no banco local e não geram e-mails.

O aviso laranja da aba Ativação lista as pendências devolvidas pelo backend. Cada link abre Configurações com `?secao=settings&campo=...`, na seção correspondente e com foco no campo.

A aba **Ativação** usa `CampaignActivation.tsx` e reutiliza o calendário de `CampaignSchedule.tsx`. É possível marcar vários dias em diferentes meses e salvar a seleção no rascunho. Resolva as pendências em Configurações e confirme a abertura no botão laranja. O mesmo botão fecha novas inscrições e preserva as reservas gravadas.

`CampaignSettings.tsx` organiza os parâmetros existentes por responsabilidade: restaurante, condições/voucher/privacidade, autorização de imagem, produção de conteúdo e agenda. O salvamento usa `PUT /admin/locomotiva/config`, mantendo controle de versão e auditoria do backend.

Salvar configurações mantém um rascunho. Use a revisão e aprovação dos documentos e confirme a publicação para abrir inscrições. O fechamento é uma ação própria e preserva os registros existentes.

A agenda aceita datas válidas no formato ISO. A migração `20261119150000_locomotiva_calendar_dates` remove a restrição antiga do banco. O calendário público usa as datas publicadas, e o backend mantém a antecedência mínima e os períodos de almoço e jantar. Revise os documentos se ainda citarem o intervalo antigo.

As operações administrativas exigem autenticação e perfil ADMIN ou MANAGER no backend. SMTP e remetente permanecem no ambiente do servidor, sem exposição de credenciais no navegador. A página final mantém a solicitação em análise até aprovação expressa por e-mail.

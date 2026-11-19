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

A Visão geral usa `CampaignOverview.tsx` e `CampaignOverview.module.css` para mostrar indicadores, gráfico por data da visita, próximas visitas e checklist. Os indicadores abrem Influenciadores com filtro de situação ou entrega. O botão **Ver** abre um resumo com voucher, check-in e entrega. **Ver participante** abre a ficha administrativa completa. A ficha administrativa fica sobre o conteúdo de `#locomotiva-admin`, com perfil, visita e histórico em três colunas no desktop e em uma coluna no celular.

Clique em uma solicitação para abrir a ficha em modal. Reservas em análise podem ser aprovadas diretamente. Administradores podem excluir definitivamente uma reserva com confirmação. A API remove o registro e os e-mails associados, registra a exclusão na auditoria e libera a vaga da data, sujeita aos horários e prazos da campanha.

A aba **Influenciadores** (`?secao=registrations`) reúne convites e reservas em uma tabela com busca, filtros por situação e data e cinco linhas por página. O estado do convite só aparece junto a uma reserva quando o backend registrou esse vínculo. Convites sem vínculo têm linha própria. **Novo convite** abre o formulário já existente.

`CampaignInfluencers.tsx` renderiza a tabela e `RegistrationDetails.tsx` renderiza a ficha em modal. O CSS compartilhado entre essas duas telas fica em `CampaignInfluencers.module.css`. A ficha reúne o perfil, a visita, os documentos aceitos, a entrega, o histórico e as observações internas. O backend entrega o CPF completo na abertura para administradores e registra a consulta na auditoria. Gestores veem o CPF mascarado na ficha.

O formulário público envia solicitações para `POST /locomotiva/registrations`. O backend salva os registros no PostgreSQL e o painel consulta `GET /admin/locomotiva`. A lista inclui todos os estados, inclusive recusadas e canceladas. A consulta automática ocorre a cada 30 segundos com a página visível, fora das configurações e da edição de um registro. O botão Atualizar faz uma consulta imediata. Reservas recebidas por telefone, WhatsApp ou outro sistema dependem de uma integração própria.

## Agenda de visitas

O painel lateral da reserva oferece atalhos por ícone para aprovar, recusar, alterar a data e excluir. Os nomes aparecem ao passar o mouse ou focar pelo teclado. Cada atalho abre a confirmação ou o formulário correspondente na ficha, de acordo com a situação e as permissões do usuário.

A aba **Calendário** (`?secao=calendar`) usa `CampaignVisitAgenda.tsx` e `CampaignVisitAgenda.module.css`. Há vistas mensal, semanal e em lista. A grade diferencia hoje e os dias dos meses vizinhos. As reservas exibem miniatura do perfil, nome, data, hora e situação. Clicar na reserva ou no número de um dia com uma única reserva abre o painel lateral com acesso à ficha administrativa. **Ver horários** abre a data completa e as opções de almoço e jantar em um modal. A ficha da reserva contém o formulário de reagendamento. O bloqueio de dias inteiros exige um motivo e é salvo no rascunho. O servidor revalida conflitos ao bloquear e publicar.

A aba **Edição do e-mail** (`?secao=email`) carrega assunto e corpo padrão para solicitação recebida, aprovação, recusa, reagendamento e cancelamento. **Salvar modelo** aplica somente o evento selecionado aos próximos envios, sem publicar as condições da campanha. **Restaurar padrão** preenche novamente os campos para revisão antes de salvar. Os e-mails usam HTML com texto escapado e versão em texto simples. O teste usa `POST /admin/locomotiva/mail/test`, exige perfil ADMIN e SMTP configurado, limita as tentativas por usuário e audita o resultado sem gravar notificações nas reservas.

## Configuração e publicação

O regulamento precisa estar preenchido para leitura e aceite no site. Sua aprovação administrativa é opcional para publicar. O termo de uso de imagem e o aviso de privacidade exigem aprovação.

Com `LOCOMOTIVA_LOCAL_TEST=true` no ambiente do backend de desenvolvimento e PostgreSQL no loopback, a aba permite ativação de teste com uma seleção de datas, documentos demonstrativos e horário de 11h30 caso nenhum tenha sido cadastrado. Os registros de teste ficam no banco local e não geram e-mails.

O aviso laranja da aba Ativação lista as pendências devolvidas pelo backend. Cada link abre Configurações com `?secao=settings&campo=...`, na seção correspondente e com foco no campo.

A aba **Ativação** usa `CampaignActivation.tsx` e `CampaignActivation.module.css` para exibir prontidão, publicação e estados da campanha. Cada requisito abre o campo correspondente em Configurações. O calendário expansível de `CampaignSchedule.tsx` permite editar e salvar datas no rascunho. A abertura manual mostra o período, a capacidade e o voucher em um modal de confirmação. A pausa bloqueia novas inscrições e preserva as reservas gravadas.

`CampaignSettings.tsx` organiza os parâmetros existentes por responsabilidade: restaurante, condições/voucher/privacidade, autorização de imagem, produção de conteúdo e agenda. O salvamento usa `PUT /admin/locomotiva/config`, mantendo controle de versão e auditoria do backend.

Salvar configurações mantém um rascunho. Use a revisão e aprovação dos documentos e confirme a publicação para abrir inscrições. O fechamento é uma ação própria e preserva os registros existentes.

A tela **Configurações da reserva** (`?secao=settings`) tem seis abas. A agenda permite selecionar um período, marcar datas individualmente e definir horários de almoço e jantar. A prévia é uma simulação local que lê o rascunho e a ocupação do painel. O servidor mantém a capacidade atual de um influenciador por dia, o fuso de Araguaína e a aprovação manual.

O valor do voucher e os modelos adicionais de e-mail persistem no rascunho e entram em vigor na publicação. A reserva mantém o voucher e as condições aceitas na inscrição. O teste administrativo de SMTP confirma a conexão com o provedor e registra o resultado na auditoria sem enviar e-mail.

A agenda aceita datas válidas no formato ISO. A migração `20261119150000_locomotiva_calendar_dates` remove a restrição antiga do banco. O calendário público usa as datas publicadas, e o backend mantém a antecedência mínima e os períodos de almoço e jantar. Revise os documentos se ainda citarem o intervalo antigo.

As operações administrativas exigem autenticação e perfil ADMIN ou MANAGER no backend. SMTP e remetente permanecem no ambiente do servidor, sem exposição de credenciais no navegador. A página final mantém a solicitação em análise até aprovação expressa por e-mail.

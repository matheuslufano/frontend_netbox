# Gestão de parcerias

## Rotas e arquivos

- `/integracoes`: cartão Parcerias abre `/integracoes/parcerias`.
- `page.tsx`: seleção de parceiros com cartão clicável e logo oficial. Atualmente exibe apenas a Locomotiva, sem consultar dados administrativos antes da seleção.
- `/integracoes/parcerias/locomotiva` (`locomotiva/page.tsx`): resumo real em `GET /admin/locomotiva`, estado das inscrições, totais e ações de gestão. Falhas não são convertidas em indicadores fictícios.
- `public/parcerias/locomotiva-logo.png`: cópia da logo oficial do projeto Locomotiva, com proporções preservadas.
- `partnerships.module.css`: estilos exclusivos da central, grade responsiva, foco visível e redução de movimento.
- `/campanha-locomotiva`: gestão existente de solicitações, calendário, convites e configurações.
- `?secao=settings` e `?secao=calendar`: abrem diretamente a seção correspondente; outros valores são ignorados.

## Configuração e publicação

`CampaignSettings.tsx` organiza os parâmetros existentes por responsabilidade: restaurante, condições/voucher/privacidade, autorização de imagem, produção de conteúdo e agenda. O salvamento usa `PUT /admin/locomotiva/config`, mantendo controle de versão e auditoria do backend.

Para abrir ou fechar inscrições, altere o aceite de publicação e salve as configurações. O backend valida os documentos obrigatórios, horários, responsável, chave de proteção dos dados e configuração de e-mail. Marcar a opção sem salvar não altera a campanha.

A campanha atual aceita datas de 21 a 30 de novembro de 2026, almoço entre 11h e antes das 15h e jantar entre 18h e antes das 23h. Antecedência permitida: 0 a 720 horas. Campos pessoais obrigatórios e modalidades de conteúdo continuam seguindo o contrato existente; não há editor arbitrário do esquema do formulário. A tela informa essas regras em vez de oferecer controles sem integração.

As operações administrativas exigem autenticação e perfil ADMIN ou MANAGER no backend. SMTP e remetente permanecem no ambiente do servidor, sem exposição de credenciais no navegador. A página final mantém a solicitação em análise até aprovação expressa por e-mail.

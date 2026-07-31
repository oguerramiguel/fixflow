# FixFlow

![Status: MVP local](https://img.shields.io/badge/status-MVP%20local-blue)
![TypeScript: strict](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Tests: local suite](https://img.shields.io/badge/tests-local%20suite-brightgreen)

Plataforma web multi-tenant para gestao de assistencias tecnicas de notebooks e
computadores.

**Status do projeto:** em desenvolvimento, com MVP funcional local e artefatos
de readiness para staging/producao. Nao existe deploy publico.

## Visao geral

FixFlow organiza o ciclo de atendimento tecnico de pequenas assistencias: cliente,
equipamento, ordem de servico, diagnostico, orcamento, decisao do cliente e
historico operacional. O projeto foi construido como portfolio tecnico para
demonstrar modelagem de dominio, isolamento por tenant, autenticacao server-side,
transacoes e testes automatizados em uma aplicacao web realista.

O MVP roda localmente e nao possui deploy publico nesta fase.

## Problema resolvido

Assistencias pequenas frequentemente acompanham atendimentos em planilhas,
mensagens soltas ou papel. Isso torna dificil responder perguntas simples:

- qual equipamento esta em diagnostico;
- qual orcamento esta aguardando aprovacao;
- qual cliente aprovou ou rejeitou o servico;
- qual foi o historico de status de uma ordem de servico;
- quais dados pertencem a cada assistencia em um contexto multiempresa.

FixFlow centraliza esse fluxo em uma aplicacao web com regras de negocio
server-side e dados isolados por `Organization`.

## Funcionalidades implementadas

- Autenticacao interna por email e senha.
- Sessao opaca persistida no PostgreSQL.
- Cookie de sessao HTTP-only.
- Logout com invalidacao server-side da sessao.
- Contexto autenticado com `userId`, `organizationId` e `role`.
- `Organization` como tenant.
- Autorizacao basica por role.
- Customer CRUD sem delete.
- Equipment CRUD sem delete.
- Cadastro de Equipment vinculado a Customer validado dentro do tenant.
- ServiceOrder com abertura, listagem, busca, filtro, detalhes e status.
- `publicCode` nao sequencial para acompanhamento publico.
- Workflow server-side de status.
- Timeline operacional de ServiceOrder.
- Diagnostic unico por ServiceOrder dentro da Organization.
- Quote unico por ServiceOrder dentro da Organization nesta fase.
- QuoteItem mutavel apenas enquanto Quote esta em `DRAFT`.
- Calculo monetario com `Prisma.Decimal`.
- DTOs monetarios como strings decimais canonicas.
- Envio logico de orcamento.
- Aprovacao e rejeicao interna de orcamento.
- Portal publico por `publicCode` em `/track/[publicCode]`.
- Aprovacao e rejeicao publica de Quote `SENT`.
- Cabecalhos HTTP de seguranca centralizados.
- Rate limiting para login, consulta publica e decisao publica de Quote.
- Auditoria de eventos de seguranca sem secrets ou `publicCode` bruto.
- Gestao de usuarios da Organization exclusiva para OWNER.
- Convites manuais com token de uso unico armazenado somente como hash.
- Configuracao publica de conta em `/setup-account/[token]`.
- Alteracao da propria senha em `/app/settings/account`, com revogacao de todas
  as sessoes.
- Redefinicao assistida por OWNER com link manual, revogavel e de uso unico.
- Limpeza manual e paginada de dados de seguranca, com modo dry-run.
- Configuracao de runtime fail-fast para development, test, staging e production.
- Liveness, readiness com PostgreSQL e identidade de release.
- Docker standalone multi-stage, runtime non-root e job separado de migrations.
- Compose local de staging isolado do desenvolvimento.
- Preflight de deploy e smoke de producao nao destrutivos.
- Seed demo completo, idempotente, opt-in e proibido em producao.
- CI de qualidade com PostgreSQL de teste isolado, sem deploy.
- Desativacao de usuario e revogacao de todas as suas sessoes.
- Protecao transacional do ultimo OWNER ativo.
- DTO publico minimo, separado dos DTOs internos.
- Isolamento por tenant em services e repositories.
- Testes automatizados de dominio, services, repositories, actions e APIs.

## Matriz de funcionalidades

| Area | Status | Observacao |
| --- | --- | --- |
| Autenticacao interna | Implementado | Email/senha, bcryptjs, sessao opaca e cookie HTTP-only. |
| Multi-tenancy | Implementado | `Organization` representa o tenant; queries internas usam `organizationId`. |
| Clientes | Implementado | Listagem, busca, detalhes, criacao e edicao; sem delete. |
| Equipamentos | Implementado | Listagem, busca, detalhes, criacao e edicao; sem delete. |
| Ordens de servico | Implementado | Abertura, listagem, filtro por status, detalhes, workflow e timeline. |
| Diagnostico | Implementado | Registro/edicao enquanto a OS esta em diagnostico. |
| Orcamento | Implementado | Quote em rascunho, itens, envio logico, aprovacao/rejeicao. |
| Portal publico | Implementado | Consulta por `publicCode` e decisao publica de Quote enviado. |
| Base de seguranca | Implementado | Headers HTTP, rate limiting e auditoria de seguranca. |
| Usuarios e convites | Implementado | OWNER gerencia equipe, convites manuais, roles, status e sessoes. |
| Senha e recuperacao | Implementado | Troca autenticada e redefinicao assistida por OWNER, sem envio de email. |
| Retencao de seguranca | Implementado | Cleanup manual em lotes, com dry-run e periodos configuraveis. |
| Dashboard | Nao implementado | A pagina interna atual e uma area de operacao com links. |
| E-mail/WhatsApp | Nao implementado | O envio do orcamento e apenas registro logico. |
| PDF/pagamento | Nao implementado | Fora do escopo do MVP atual. |
| Deploy/CI | Readiness implementada | Docker, staging local, preflight, smoke e CI; nenhum deploy publico executado. |

## Destaques tecnicos

- Multi-tenancy com `Organization`.
- Isolamento de dados por `organizationId` em operacoes internas.
- `organizationId` confiavel resolvido no servidor a partir do User persistido.
- DTOs internos e publicos separados.
- Autenticacao com sessao opaca.
- Cookie HTTP-only.
- `bcryptjs` com protecao contra truncation silenciosa de senhas longas/UTF-8.
- Repositories tenant-aware.
- Workflows de dominio para ServiceOrder e Quote.
- Transacoes Prisma para criacao de OS + timeline e fluxos comerciais.
- Concorrencia otimista por status esperado.
- Timeline/auditoria operacional.
- `publicCode` nao sequencial como capability URL limitada.
- Rate limiting com store em memoria para desenvolvimento/testes e store
  PostgreSQL/Prisma para producao.
- Auditoria de login, logout, bloqueios por rate limit e decisoes publicas.
- Convites com token aleatorio de 32 bytes, SHA-256 persistido e validade de 72 horas.
- Consumo atomico de convite e ativacao sem senha temporaria.
- Tokens de redefinicao com 32 bytes, SHA-256 persistido, expiracao configuravel,
  revogacao e consumo atomico.
- Troca e redefinicao de senha revogam todas as sessoes do usuario.
- Cleanup de sessoes, convites, tokens, contadores e auditoria em lotes
  configuraveis.
- Validacao central de runtime para banco, URL-base, release, proxy, origins,
  stores persistentes, retencoes e cookies seguros.
- `/api/health/live` sem dependencias e `/api/health/ready` com consulta
  PostgreSQL limitada por timeout.
- Imagem standalone multi-stage non-root e migrations fora do startup web.
- Smoke somente com GET, sem autenticacao, mutacao ou leitura de dados internos.
- Sessao revalida User ativo e Organization persistida a cada contexto.
- Lock transacional da Organization para proteger o ultimo OWNER ativo.
- Headers HTTP de seguranca com CSP inicial e HSTS somente em producao.
- Calculo monetario com `Prisma.Decimal`.
- Money DTO como string canonica com duas casas decimais.
- Validacoes centralizadas de entrada e dominio.
- Testes automatizados cobrindo regras, services, repositories, actions e APIs.

## Stack

Versoes reais registradas em `package.json` e `package-lock.json`:

- Next.js 16.2.12
- React 19.1.0
- TypeScript 5.8.3
- Tailwind CSS 3.4.17
- Prisma 6.10.1
- PostgreSQL 16 via Docker Compose
- Vitest 3.2.7
- ESLint 9.29.0
- bcryptjs 3.0.2
- npm 10.9.2

## Arquitetura resumida

O projeto usa Next.js App Router e uma separacao simples em camadas:

- `src/app`: rotas, layouts, paginas, route handlers e Server Actions.
- `src/components`: componentes de apresentacao.
- `src/domain`: entidades, validacoes, workflows e erros de dominio.
- `src/server/auth`: autenticacao, sessao, cookie e autorizacao.
- `src/server/db`: Prisma Client centralizado.
- `src/server/repositories`: acesso a dados tenant-aware.
- `src/server/services`: casos de uso server-side.
- `src/server/security`: cabecalhos, rate limiting, auditoria e validacao de
  configuracao de seguranca.
- `src/server/runtime`: validacao central de ambiente e identidade de release.
- `src/server/operations`: health, preflight de deploy e smoke operacional.
- `prisma`: schema, migrations e seed.
- `tests`: testes automatizados.
- `docs`: documentacao tecnica e de portfolio.

Componentes React nao concentram regras complexas de dominio. Regras sensiveis,
como mudancas de status, calculo monetario, autorizacao e isolamento por tenant,
sao revalidadas no servidor.

## Fluxo principal do sistema

1. Usuario interno faz login.
2. Sistema resolve `AuthenticatedContext` a partir da sessao.
3. Usuario cadastra cliente.
4. Usuario cadastra equipamento vinculado ao cliente.
5. Usuario abre ordem de servico para o equipamento.
6. Sistema gera `publicCode` nao sequencial e timeline inicial.
7. OS avanca para diagnostico.
8. Usuario registra Diagnostic.
9. Usuario cria Quote e adiciona QuoteItems.
10. Sistema calcula subtotal e total com Decimal.
11. Usuario OWNER ou ADMIN marca o Quote como enviado.
12. Cliente acessa o portal publico por `publicCode`.
13. Cliente aprova ou rejeita o Quote enviado.
14. Sistema atualiza Quote, ServiceOrder e timeline de forma atomica.

O fluxo administrativo de usuarios e separado do fluxo operacional:

1. OWNER acessa `/app/settings/users`.
2. OWNER cria um convite com nome, email e role.
3. O sistema cria um User sem senha e retorna um link uma unica vez.
4. O OWNER compartilha o link manualmente.
5. O convidado define a propria senha em `/setup-account/[token]`.
6. O token e consumido atomicamente e o usuario passa a poder autenticar.

Para credenciais de uma conta ativa:

1. Qualquer usuario autenticado altera a propria senha em
   `/app/settings/account`, informando a senha atual.
2. O sistema atualiza o hash e revoga todas as sessoes, inclusive a corrente.
3. Se o usuario nao souber a senha, um OWNER da mesma Organization gera um link
   em `/app/settings/users`.
4. O link e compartilhado manualmente e consumido em
   `/reset-password/[token]`; nao ha email automatico nem login automatico.

## Portal publico

O portal publico fica em:

```text
/track/[publicCode]
```

Ele permite acompanhar uma unica ordem de servico por `publicCode`, sem login do
cliente. O DTO publico e minimo e nao expoe Customer, email, telefone, documento,
IDs internos, `organizationId`, `passwordHash`, `tokenHash` ou objetos Prisma
completos.

Quote em `DRAFT` nao aparece publicamente. A aprovacao/rejeicao publica so fica
disponivel quando o Quote esta em `SENT` e a ServiceOrder esta em
`WAITING_FOR_APPROVAL`.

## Seguranca e multi-tenancy

- `organizationId` nao vem do browser para autorizacao ou isolamento.
- O tenant vem do User autenticado persistido no servidor.
- Repositories internos filtram recursos por `organizationId`.
- IDs de recursos recebidos do browser sao revalidados dentro do tenant.
- `publicCode` nao autoriza operacoes internas nem listagem de recursos.
- O portal publico nao usa `AuthenticatedContext`.
- O DTO publico nao expoe dados de Customer nem IDs internos.
- Senhas nao sao armazenadas em texto puro.
- Tokens brutos de sessao nao sao persistidos no banco.
- Tokens brutos de convite nao sao persistidos, logados ou auditados.
- Tokens brutos de redefinicao de senha nao sao persistidos, logados ou
  auditados; somente SHA-256 e armazenado.
- Usuario convidado ou desativado nao consegue autenticar.
- Sessoes existentes deixam de autorizar assim que o User e desativado.
- Cookies de sessao usam `httpOnly`.
- Valores sensiveis nao devem usar prefixo `NEXT_PUBLIC`.
- `.env` nao deve ser versionado.
- Senhas, cookies, tokens, `tokenHash` e `publicCode` bruto nao devem aparecer
  em logs ou auditoria.
- Rate limit e auditoria usam hashes de identificadores sensiveis/publicos.
- Em producao, rate limit deve usar PostgreSQL/Prisma e auditoria deve estar
  habilitada em banco.

Essas medidas reduzem riscos no escopo do MVP local, mas nao substituem
observabilidade, revisao de seguranca, controles de borda e politicas
operacionais de producao.

## Testes

Comando executado:

```bash
npm run test
```

A suite local cobre:

- validacoes de dominio;
- publicCode;
- workflow de ServiceOrder;
- workflow de Quote;
- parser monetario com Decimal;
- politica e hashing de senha;
- autenticacao e contexto autenticado;
- autorizacao por role;
- Customer e Equipment services/repositories/actions;
- ServiceOrder service/repository/actions;
- Diagnostic e Quote services/repositories/actions;
- portal publico por `publicCode`;
- aprovacao/rejeicao publica de Quote;
- rate limiting e auditoria de seguranca;
- gestao de usuarios, convites, setup de conta, roles e sessoes;
- alteracao de senha e redefinicao assistida por OWNER;
- consumo concorrente de tokens e revogacao de sessoes;
- cleanup de seguranca em dry-run, lotes e execucao idempotente;
- cabecalhos HTTP de seguranca;
- DTO publico minimo e isolamento de dados.

Validacoes adicionais usadas no projeto:

```bash
npm run lint
npm run typecheck
npm run build
npm run prisma:validate
npm run prisma:format
```

## Como rodar localmente

1. Clone o repositorio:

```bash
git clone <repository-url>
```

2. Entre na pasta:

```bash
cd FixFlow
```

3. Crie o arquivo `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Em Bash/WSL:

```bash
cp .env.example .env
```

4. Preencha a `DATABASE_URL` local compativel com o `docker-compose.yml`:

```env
DATABASE_URL="postgresql://fixflow_dev:fixflow_dev_password@localhost:5432/fixflow_dev?schema=public"
```

5. Suba o PostgreSQL:

```bash
docker compose up -d
```

6. Instale as dependencias:

```bash
npm install
```

7. Aplique as migrations:

```bash
npx prisma migrate dev
```

8. Gere o Prisma Client quando necessario:

```bash
npx prisma generate
```

9. Rode o seed de desenvolvimento:

```bash
npm run db:seed
```

10. Rode a aplicacao:

```bash
npm run dev
```

11. Abra:

```text
http://localhost:3000
```

Em PowerShell com politica restritiva de scripts, use os executaveis `.cmd`:

```powershell
npm.cmd run dev
npx.cmd prisma migrate dev
```

Para aplicar migrations ja versionadas em um ambiente controlado, sem criar
migration nova:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma generate
```

Nao use `prisma migrate reset` nem `db push` como substituto.

Antes de remover dados antigos de seguranca, confira o dry-run:

```powershell
npm.cmd run security:cleanup -- --dry-run
npm.cmd run security:cleanup
```

O segundo comando e destrutivo para registros de seguranca elegiveis pelas
retencoes, mas nao remove entidades de negocio. Nao ha agendamento embutido.

Os testes PostgreSQL opcionais exigem `FIXFLOW_TEST_DATABASE_URL` diferente de
`DATABASE_URL` e com nome de banco contendo `test`. Eles sao ignorados quando a
variavel nao existe. O procedimento completo e seguro esta em
`docs/local-development.md`.

## Variaveis de ambiente

Variaveis esperadas no `.env` local:

```env
DATABASE_URL="postgresql://fixflow_dev:fixflow_dev_password@localhost:5432/fixflow_dev?schema=public"
FIXFLOW_TEST_DATABASE_URL=""

FIXFLOW_APP_ENV="development"
FIXFLOW_APP_BASE_URL="http://localhost:3000"
FIXFLOW_RELEASE_SHA="development"
FIXFLOW_TRUST_PROXY="false"
FIXFLOW_SERVER_ACTION_ALLOWED_ORIGINS="localhost:3000"
FIXFLOW_READINESS_TIMEOUT_MS="2000"
FIXFLOW_RATE_LIMIT_STORE="memory"
FIXFLOW_RATE_LIMIT_LOGIN_ATTEMPT_LIMIT="5"
FIXFLOW_RATE_LIMIT_LOGIN_ATTEMPT_WINDOW_SECONDS="300"
FIXFLOW_RATE_LIMIT_ACCOUNT_SETUP_ATTEMPT_LIMIT="5"
FIXFLOW_RATE_LIMIT_ACCOUNT_SETUP_ATTEMPT_WINDOW_SECONDS="300"
FIXFLOW_RATE_LIMIT_PASSWORD_CHANGE_ATTEMPT_LIMIT="5"
FIXFLOW_RATE_LIMIT_PASSWORD_CHANGE_ATTEMPT_WINDOW_SECONDS="300"
FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CREATE_LIMIT="5"
FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CREATE_WINDOW_SECONDS="900"
FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CONSUME_LIMIT="5"
FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CONSUME_WINDOW_SECONDS="300"
FIXFLOW_RATE_LIMIT_PUBLIC_PORTAL_LOOKUP_LIMIT="60"
FIXFLOW_RATE_LIMIT_PUBLIC_PORTAL_LOOKUP_WINDOW_SECONDS="60"
FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_APPROVE_LIMIT="5"
FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_APPROVE_WINDOW_SECONDS="300"
FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_REJECT_LIMIT="5"
FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_REJECT_WINDOW_SECONDS="300"
FIXFLOW_SECURITY_AUDIT_ENABLED="true"
FIXFLOW_SECURITY_AUDIT_STORE="database"
FIXFLOW_PASSWORD_RESET_TOKEN_TTL_MINUTES="30"
FIXFLOW_SECURITY_RETENTION_EXPIRED_SESSION_DAYS="7"
FIXFLOW_SECURITY_RETENTION_CLOSED_INVITATION_DAYS="30"
FIXFLOW_SECURITY_RETENTION_CLOSED_PASSWORD_RESET_DAYS="30"
FIXFLOW_SECURITY_RETENTION_RATE_LIMIT_COUNTER_SECONDS="86400"
FIXFLOW_SECURITY_RETENTION_AUDIT_LOG_DAYS="90"
FIXFLOW_SECURITY_CLEANUP_BATCH_SIZE="500"

FIXFLOW_BOOTSTRAP_ORGANIZATION_NAME=""
FIXFLOW_BOOTSTRAP_ORGANIZATION_SLUG=""
FIXFLOW_BOOTSTRAP_USER_NAME=""
FIXFLOW_BOOTSTRAP_USER_EMAIL=""
FIXFLOW_BOOTSTRAP_USER_PASSWORD=""
```

Nao use secrets reais no repositorio. O arquivo `.env.example` deve permanecer
apenas como modelo. A store `memory` de rate limit e somente para
desenvolvimento/testes; producao deve configurar `FIXFLOW_RATE_LIMIT_STORE` como
`database`.

Staging e producao exigem configuracao explicita e stores persistentes.
Producao exige URL-base HTTPS. Consulte `.env.staging.example`,
`docs/deployment.md` e `docs/production-readiness-checklist.md`; nunca copie
placeholders ou credenciais de exemplo para um ambiente real.

## Health, deploy check e smoke

```text
GET /api/health/live
GET /api/health/ready
```

Liveness testa somente o processo. Readiness testa configuracao e uma consulta
minima ao PostgreSQL com timeout e retorna `503` seguro em falha. Ambos
identificam versao e `FIXFLOW_RELEASE_SHA`.

Depois de migrations versionadas em ambiente controlado:

```powershell
npm.cmd run deploy:check
npm.cmd run smoke:production -- --base-url https://target.example
```

Os dois comandos sao nao destrutivos. O preflight nao aplica migrations; o
smoke usa somente GETs anonimos.

## Usuario de desenvolvimento

O comando `npm run db:seed` cria ou atualiza uma Organization e um usuario OWNER
local usando:

- `FIXFLOW_BOOTSTRAP_ORGANIZATION_NAME`
- `FIXFLOW_BOOTSTRAP_ORGANIZATION_SLUG`
- `FIXFLOW_BOOTSTRAP_USER_NAME`
- `FIXFLOW_BOOTSTRAP_USER_EMAIL`
- `FIXFLOW_BOOTSTRAP_USER_PASSWORD`

Exemplo ficticio para ambiente local:

```env
FIXFLOW_BOOTSTRAP_ORGANIZATION_NAME="FixFlow Demo"
FIXFLOW_BOOTSTRAP_ORGANIZATION_SLUG="fixflow-demo"
FIXFLOW_BOOTSTRAP_USER_NAME="Admin Local"
FIXFLOW_BOOTSTRAP_USER_EMAIL="admin@fixflow.local"
FIXFLOW_BOOTSTRAP_USER_PASSWORD="ChangeMeLocal123!"
```

Esse usuario e criado localmente pelo seed. Nao reutilize esse exemplo como
senha real.

## Scripts uteis

Scripts reais do `package.json`:

| Script | Uso |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento Next.js. |
| `npm run build` | Gera build de producao da aplicacao. |
| `npm run start` | Inicia a aplicacao buildada. |
| `npm run lint` | Executa ESLint no repositorio. |
| `npm run typecheck` | Executa TypeScript sem emitir arquivos. |
| `npm run test` | Executa Vitest uma vez. |
| `npm run test:postgres` | Executa testes destrutivos opcionais em um banco de teste separado. |
| `npm run test:watch` | Executa Vitest em modo watch. |
| `npm run security:cleanup -- --dry-run` | Conta registros elegiveis sem excluir. |
| `npm run security:cleanup` | Exclui dados de seguranca elegiveis em lotes. |
| `npm run deploy:check` | Valida runtime, Prisma, migrations, banco e stores sem escrever. |
| `npm run smoke:production -- --base-url <url>` | Executa smoke anonimo somente-leitura. |
| `npm run db:seed` | Executa o seed de desenvolvimento. |
| `npm run db:seed:demo` | Seed demo idempotente, opt-in e proibido em producao. |
| `npm run prisma:generate` | Gera Prisma Client. |
| `npm run prisma:migrate` | Executa `prisma migrate dev`. |
| `npm run prisma:validate` | Valida o schema Prisma. |
| `npm run prisma:format` | Formata o schema Prisma. |

## Fluxo sugerido para demonstracao

1. Fazer login com o usuario criado pelo seed.
2. Criar cliente.
3. Criar equipamento vinculado ao cliente.
4. Abrir ordem de servico para o equipamento.
5. Avancar a OS para diagnostico.
6. Registrar Diagnostic.
7. Criar Quote.
8. Adicionar QuoteItems.
9. Marcar o Quote como enviado.
10. Abrir o portal publico com o `publicCode`.
11. Aprovar ou rejeitar o Quote pelo portal publico.
12. Conferir status e timeline na area interna.
13. Como OWNER, abrir `/app/settings/users` e criar um convite.
14. Copiar o link exibido, abrir em janela anonima e definir a senha.
15. Confirmar login do convidado e revogacao de sessoes pela tela administrativa.
16. Alterar a propria senha em `/app/settings/account` e confirmar que todas as
    sessoes pedem novo login.
17. Como OWNER, gerar um link de redefinicao para um usuario ativo e consumi-lo
    em janela anonima.

## Screenshots

Adicionar prints reais da aplicacao aqui antes de publicar o repositorio como
portfolio. Nao ha screenshots versionados nesta fase.

Sugestoes de telas para capturar estao em `docs/portfolio.md`.

## Estrutura do projeto

```text
src/
  app/
  components/
  domain/
  lib/
  server/
prisma/
  migrations/
  schema.prisma
  seed.ts
tests/
docs/
```

## Documentacao tecnica

- `docs/requirements.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/authentication.md`
- `docs/customer-equipment.md`
- `docs/service-orders.md`
- `docs/service-order-workflow.md`
- `docs/diagnostic-quotes.md`
- `docs/public-portal.md`
- `docs/security.md`
- `docs/portfolio.md`
- `docs/manual-qa.md`
- `docs/local-development.md`
- `docs/staging.md`
- `docs/deployment.md`
- `docs/production-readiness-checklist.md`
- `docs/operations-runbook.md`
- `docs/backup-restore.md`
- `docs/linkedin-post.md`

## Roadmap

Implementado:

- autenticacao interna;
- clientes e equipamentos;
- ordens de servico;
- diagnostico e orcamento;
- portal publico por `publicCode`;
- base de seguranca com headers, rate limiting e auditoria;
- gestao de usuarios, convites manuais e sessoes;
- alteracao de senha, redefinicao assistida e cleanup manual de seguranca.
- readiness para staging/producao, Docker seguro, CI, preflight, smoke e
  documentacao operacional.

Proximos passos possiveis:

- proposta/PDF;
- envio externo controlado do link publico;
- observabilidade e alertas;
- agendamento externo e observabilidade do cleanup de seguranca;
- testes E2E;
- melhorias visuais;
- hardening de producao;
- envio de convite ou link de redefinicao por email.

Nao ha datas prometidas para esses itens.

## Limitacoes atuais

- Sem deploy publico ou provedor de infraestrutura configurado.
- Sem envio real de email, WhatsApp ou SMS.
- Sem PDF.
- Sem pagamento.
- Sem WAF, CAPTCHA ou observabilidade de producao.
- CI valida qualidade e PostgreSQL; nao existe CD nem deploy automatico.
- Sem testes E2E.
- Sem dashboard funcional.
- Convites precisam ser compartilhados manualmente pelo OWNER.
- Recuperacao e assistida por OWNER; nao ha fluxo autonomo por email.
- Um OWNER bloqueado depende de outro OWNER ativo; a recuperacao operacional do
  unico OWNER fica fora desta fase.
- O cleanup existe como comando manual; nao ha scheduler embutido.
- Portal publico baseado em `publicCode` como capability URL.
- O Compose de staging e local e nao substitui infraestrutura gerenciada,
  observabilidade, TLS de borda ou operacao real.

Esses pontos representam o escopo atual do MVP, nao funcionalidades simuladas.

## Autor / Portfolio

Projeto desenvolvido como portfolio tecnico. Antes de publicar, adicione links
reais de GitHub, LinkedIn e portfolio pessoal nesta secao.

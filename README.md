# FixFlow

![Status: MVP local](https://img.shields.io/badge/status-MVP%20local-blue)
![TypeScript: strict](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Tests: 220](https://img.shields.io/badge/tests-220%20passing-brightgreen)

Plataforma web multi-tenant para gestao de assistencias tecnicas de notebooks e
computadores.

**Status do projeto:** em desenvolvimento, com MVP funcional local.

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
| Dashboard | Nao implementado | A pagina interna atual e uma area de operacao com links. |
| E-mail/WhatsApp | Nao implementado | O envio do orcamento e apenas registro logico. |
| PDF/pagamento | Nao implementado | Fora do escopo do MVP atual. |
| Deploy/CI | Nao implementado | Projeto validado localmente. |

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
- Calculo monetario com `Prisma.Decimal`.
- Money DTO como string canonica com duas casas decimais.
- Validacoes centralizadas de entrada e dominio.
- Testes automatizados cobrindo regras, services, repositories, actions e APIs.

## Stack

Versoes reais registradas em `package.json` e `package-lock.json`:

- Next.js 16.2.10
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
- Cookies de sessao usam `httpOnly`.
- Valores sensiveis nao devem usar prefixo `NEXT_PUBLIC`.
- `.env` nao deve ser versionado.

Essas medidas reduzem riscos no escopo do MVP local, mas nao substituem hardening
de producao, rate limiting, observabilidade, revisao de seguranca e politicas
operacionais.

## Testes

Comando executado:

```bash
npm run test
```

Resultado real da ultima execucao local da Fase 7:

- 32 arquivos de teste.
- 220 testes passando.

A suite cobre:

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

## Variaveis de ambiente

Variaveis esperadas no `.env` local:

```env
DATABASE_URL="postgresql://fixflow_dev:fixflow_dev_password@localhost:5432/fixflow_dev?schema=public"

FIXFLOW_BOOTSTRAP_ORGANIZATION_NAME=""
FIXFLOW_BOOTSTRAP_ORGANIZATION_SLUG=""
FIXFLOW_BOOTSTRAP_USER_NAME=""
FIXFLOW_BOOTSTRAP_USER_EMAIL=""
FIXFLOW_BOOTSTRAP_USER_PASSWORD=""
```

Nao use secrets reais no repositorio. O arquivo `.env.example` deve permanecer
apenas como modelo.

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
| `npm run test:watch` | Executa Vitest em modo watch. |
| `npm run db:seed` | Executa o seed de desenvolvimento. |
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
- `docs/portfolio.md`
- `docs/manual-qa.md`
- `docs/local-development.md`
- `docs/linkedin-post.md`

## Roadmap

Implementado:

- autenticacao interna;
- clientes e equipamentos;
- ordens de servico;
- diagnostico e orcamento;
- portal publico por `publicCode`.

Proximos passos possiveis:

- proposta/PDF;
- envio externo controlado do link publico;
- rate limiting no portal publico e login;
- auditoria mais detalhada;
- deploy;
- CI;
- testes E2E;
- melhorias visuais;
- observabilidade;
- hardening de producao.

Nao ha datas prometidas para esses itens.

## Limitacoes atuais

- Sem deploy publico.
- Sem envio real de email, WhatsApp ou SMS.
- Sem PDF.
- Sem pagamento.
- Sem rate limiting.
- Sem CI/CD.
- Sem testes E2E.
- Sem dashboard funcional.
- Portal publico baseado em `publicCode` como capability URL.
- Docker Compose fornece PostgreSQL local; nao e um setup completo de producao.

Esses pontos representam o escopo atual do MVP, nao funcionalidades simuladas.

## Autor / Portfolio

Projeto desenvolvido como portfolio tecnico. Antes de publicar, adicione links
reais de GitHub, LinkedIn e portfolio pessoal nesta secao.

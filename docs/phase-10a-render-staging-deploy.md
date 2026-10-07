# Fase 10A — preparação do primeiro staging no Render

Auditoria local de 2026-10-07. **Não houve deploy externo.** Este documento é
um procedimento para execução futura por um operador humano, usando somente
dados fictícios. Não autoriza contratação nem aplicação de infraestrutura.

## Configuração revisada

O checkout inicial estava limpo em `feat/phase-10a-render-staging-deploy`.
HEAD e a referência local `origin/main` eram
`e25760ae960c09eaf4db52a31056f135c953250f`; não foi feito fetch nesta auditoria.
As fases anteriores, incluindo a identidade FixFlow 1.0, já estavam integradas.

| Item do repositório | Decisão da auditoria |
| --- | --- |
| Web | Docker; `./Dockerfile`; contexto `.`; estágio final `render`; uma instância |
| Plano web | `starter` atualizado para `0.5c-512mb` |
| Plano PostgreSQL | `basic-256mb` atualizado para `0.1c-256mb` |
| Região | `virginia` em ambos os recursos; confirmar antes de criar |
| Banco | PostgreSQL 16, 5 GB, autoscaling desativado, sem pool adicional |
| Rede do banco | `fromDatabase.connectionString`, `ipAllowList: []`; sem URL local |
| Deploy | `branch: main`, `autoDeployTrigger: off` já existente e preservado |
| Readiness | `/api/health/ready` preservado |
| Start | `node scripts/render-start.mjs`, também o CMD da imagem `render` |
| Pre-deploy | migrations e deploy check sequenciais; sem seed |
| URL e origens | valores manuais exatos; nenhum domínio final presumido |

A [referência do Blueprint](https://render.com/docs/blueprint-spec) confirma
os campos usados e `autoDeployTrigger: off`. Os
[planos atuais](https://render.com/docs/compute-plans) mantêm os nomes antigos
como aliases: a mudança de identificadores preserva CPU/RAM, não representa
upgrade. Confirme o preço total no painel antes de aplicar: web, banco, disco,
workspace, tráfego, pipeline e instância temporária de recovery. Não use a
estimativa histórica da Fase 9B como cotação.

O target `migration` agora usa o usuário não-root `node`; `runner` e `render`
continuam com `nextjs`. Node continua `22.14.0-alpine3.21`, npm 10.9.2,
Prisma Client 6.10.1 e Next standalone. `runner` inicia `server.js`;
`migration` inicia Prisma migrate deploy; `render` inicia o wrapper de release.
Nenhum target aplica migrations durante o build.

O builder recebe somente o argumento público
`FIXFLOW_SERVER_ACTION_ALLOWED_ORIGINS`. Isso permite ao `next.config.ts`
incorporar a allowlist na imagem. Compose encaminha o mesmo argumento.
Conforme [Docker no Render](https://render.com/docs/docker), a plataforma
disponibiliza variáveis como build args; o Dockerfile não declara argumentos
para banco, senhas ou tokens. Mudança de hostname exige novo build.

## Inventário de ambiente

| Origem | Variáveis | Uso |
| --- | --- | --- |
| A — Render | `RENDER_GIT_COMMIT` | SHA da revisão; wrapper copia para `FIXFLOW_RELEASE_SHA` no processo web |
| A — Render | `RENDER_EXTERNAL_URL`, `RENDER_EXTERNAL_HOSTNAME` | consultar para confirmar URL e host atribuídos; não há fallback automático no código |
| B — Blueprint | `DATABASE_URL` | referência privada ao banco, com credencial gerenciada; nunca copiar para evidências |
| B — Blueprint | `NODE_ENV=production`, `FIXFLOW_APP_ENV=staging`, `PORT=3000` | modo e porta; imagem escuta `0.0.0.0` |
| B — Blueprint | `FIXFLOW_TRUST_PROXY=true` | somente atrás do proxy confiável; verificar encaminhamento antes de aprovar staging |
| B — Blueprint | `FIXFLOW_READINESS_TIMEOUT_MS=2000` | limite da verificação de dependências |
| B — Blueprint | `FIXFLOW_RATE_LIMIT_STORE=database` | contadores persistentes |
| B — Blueprint | `FIXFLOW_SECURITY_AUDIT_ENABLED=true`, `FIXFLOW_SECURITY_AUDIT_STORE=database` | auditoria persistente |
| C — operador | `FIXFLOW_APP_BASE_URL` | `https://<nome-do-servico>.onrender.com`, substituído pela URL atribuída |
| C — operador | `FIXFLOW_SERVER_ACTION_ALLOWED_ORIGINS` | `<nome-do-servico>.onrender.com`, sem protocolo, path ou wildcard |

Valores adicionais já explícitos no Blueprint:

| Prefixo/variável | Valor |
| --- | --- |
| `FIXFLOW_RATE_LIMIT_LOGIN_ATTEMPT_LIMIT` / `_WINDOW_SECONDS` | 5 / 300 |
| `FIXFLOW_RATE_LIMIT_ACCOUNT_SETUP_ATTEMPT_LIMIT` / `_WINDOW_SECONDS` | 5 / 300 |
| `FIXFLOW_RATE_LIMIT_PASSWORD_CHANGE_ATTEMPT_LIMIT` / `_WINDOW_SECONDS` | 5 / 300 |
| `FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CREATE_LIMIT` / `_WINDOW_SECONDS` | 5 / 900 |
| `FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CONSUME_LIMIT` / `_WINDOW_SECONDS` | 5 / 300 |
| `FIXFLOW_RATE_LIMIT_PUBLIC_PORTAL_LOOKUP_LIMIT` / `_WINDOW_SECONDS` | 60 / 60 |
| `FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_APPROVE_LIMIT` / `_WINDOW_SECONDS` | 5 / 300 |
| `FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_REJECT_LIMIT` / `_WINDOW_SECONDS` | 5 / 300 |
| `FIXFLOW_PASSWORD_RESET_TOKEN_TTL_MINUTES` | 30 |
| `FIXFLOW_SECURITY_RETENTION_EXPIRED_SESSION_DAYS` | 7 |
| `FIXFLOW_SECURITY_RETENTION_CLOSED_INVITATION_DAYS` | 30 |
| `FIXFLOW_SECURITY_RETENTION_CLOSED_PASSWORD_RESET_DAYS` | 30 |
| `FIXFLOW_SECURITY_RETENTION_RATE_LIMIT_COUNTER_SECONDS` | 86400 |
| `FIXFLOW_SECURITY_RETENTION_AUDIT_LOG_DAYS` | 90 |
| `FIXFLOW_SECURITY_CLEANUP_BATCH_SIZE` | 500 |

`FIXFLOW_RELEASE_SHA` não deve ficar manualmente fixado em uma revisão antiga.
O pre-deploy atribui o `RENDER_GIT_COMMIT` ao deploy check e o wrapper faz o
mesmo antes de iniciar o web. Fora do Render, fornecer um identificador real
de release explicitamente. As
[variáveis padrão do Render](https://render.com/docs/environment-variables)
não substituem automaticamente as variáveis próprias do FixFlow.

Não configurar `FIXFLOW_BOOTSTRAP_*`, credenciais demo, `NEXT_PUBLIC_*` com
secrets ou seed ativo. A `.env.staging.example` é exclusivamente um modelo
local; não importar seus valores de localhost/CHANGE_ME para o Render.

## URL do primeiro deploy: ordem necessária

O runtime e o deploy check exigem URL e origem antes de aprovar o deploy.
Assim, esperar o primeiro deploy **bem-sucedido** para só então preenchê-las
causaria um bloqueio. Usar o hostname efetivamente atribuído pelo Render,
verificado no painel, antes de liberar o primeiro deploy bem-sucedido.

Se o assistente de criação ainda não mostrar a URL, não deduzi-la a partir
do nome do serviço e não inserir os placeholders literalmente. Após a criação
autorizada, obter a URL na página do serviço e preencher as duas variáveis.
Cancelar uma tentativa inicial ainda em andamento quando necessário; uma
tentativa que falhou por configuração incompleta não é staging aprovado.
Reexecutar um deploy manual com novo build e confirmar os valores após o
primeiro sucesso. Não reduzir validações para contornar esse passo.

`sync: false` solicita esses valores no fluxo de criação. Se o painel exigir
ambos antes de disponibilizar a URL, interromper a aplicação e resolver a
atribuição no painel/suporte do Render; não inventar uma URL nem usar wildcard.
O guia não presume que a interface permitirá adiar esse preenchimento.

## Procedimento externo — 30 passos do operador

Nenhum passo externo abaixo foi executado nesta fase.

1. **Pré-requisitos:** revisão e integração humana das alterações, SHA aprovado
   disponível em `main`, CI verde, runtime oficial, responsável operacional e
   aprovação de orçamento. O Blueprint continua apontando para `main`, não
   para esta branch local. Conferir ausência de secrets no commit futuro.
2. Criar/entrar na conta Render e selecionar workspace autorizado, sem aceitar
   contratação automaticamente.
3. Conectar GitHub com acesso somente ao repositório necessário.
4. Selecionar o repositório FixFlow correto e conferir proprietário e branch.
5. Criar a proposta de Blueprint a partir de `render.yaml` revisado.
6. Revisar **todos** os recursos antes de Apply; confirmar que os nomes não
   correspondem a serviços existentes que seriam alterados inadvertidamente.
7. Confirmar `virginia` para web e DB, mesma rede privada/workspace; região
   deve ser decidida antes da criação.
8. Conferir plano web `0.5c-512mb`, uma instância, e capacidade inicial.
9. Conferir DB `0.1c-256mb`, PostgreSQL 16, 5 GB, IPs externos bloqueados,
   `connectionPool: none`, autoscaling de disco desativado e recovery pago.
10. Aprovar o total mensal no painel, inclusive disco, workspace e custos de
    build/recovery. Não aplicar se faltar aprovação financeira.
11. Confirmar `autoDeployTrigger: off`. A criação inicial e alterações de
    configuração podem iniciar deploys mesmo com auto deploy de commits off;
    conferir também a sincronização automática do Blueprint no painel.
12. Preencher `FIXFLOW_APP_BASE_URL` com a URL HTTPS atribuída, seguindo a
    ordem e o bloqueio descritos acima; sem domínio personalizado.
13. Preencher `FIXFLOW_SERVER_ACTION_ALLOWED_ORIGINS` com o host exato da URL,
    sem protocolo e sem wildcard; confirmar o argumento público no build.
14. **Aplicar Blueprint somente após aprovação de custo e revisão.** Esta ação
    cria os recursos pagos. Se a URL só surgir após criar, completar 12–13
    antes do primeiro deploy aprovado. Nunca registrar a conexão privada.
15. Acompanhar o build da imagem `render`, registrar SHA/digest e confirmar
    que não incorporou `.env`, chaves ou backups. Acionar Manual Deploy para
    o SHA aprovado quando a configuração estiver completa.
16. Acompanhar pre-deploy: `npm run prisma:migrate:deploy` seguido de
    `FIXFLOW_RELEASE_SHA=$RENDER_GIT_COMMIT npm run deploy:check`. Confirmar
    sucesso de ambos; em erro, parar e investigar, sem reset/db push/seed.
17. Aguardar health check `/api/health/ready` antes de aceitar tráfego. Conferir
    que a revisão mostrada corresponde ao SHA selecionado.
18. Testar via HTTPS `GET /api/health/live`: HTTP 200, payload mínimo, release
    esperado; sem stack, hostname do banco ou credenciais.
19. Testar `GET /api/health/ready`: HTTP 200 quando pronto. O caso indisponível
    retorna 503; já coberto localmente por testes. Não interromper o banco ativo
    somente para provar esse caso.
20. Executar localmente `npm run smoke:production -- --base-url
    https://<nome-do-servico>.onrender.com` com a URL substituída. Exigir todos
    os checks. O CLI não testa login autenticado nem orçamento/portal válido.
21. Provisionar **FixFlow Demo**: validar dry-run e então usar terminal SSH
    interativo efêmero; comandos abaixo. Nenhuma senha temporária nem seed.
22. OWNER acessa o convite privado, define a própria senha e testa login,
    logout e acesso autenticado. Não gravar sessão, token ou senha em evidência.
23. Pela UI, criar cliente, equipamento e OS inteiramente fictícios; conferir
    listagem, detalhe, busca e vínculo correto no tenant.
24. Criar diagnóstico e orçamento DRAFT, adicionar itens e enviar pelo fluxo
    normal; conferir totais, status e timeline. Não editar status via SQL.
25. Copiar o link público da OS e testar `/track/[publicCode]` anônimo, sem
    IDs internos/dados do cliente; aprovar/rejeitar em cenários fictícios
    distintos e verificar as transições esperadas.
26. Validar identidade FixFlow 1.0, tema claro/escuro e desktop/mobile no
    ambiente real, inclusive login e portal.
27. Revisar logs, erros, headers, cookies HTTPS, proxy e auditoria. Excluir
    tokens/links de setup/reset, senhas, emails e connection strings das
    evidências. Se o provedor registrar tokens no path, resolver a retenção/
    redação antes de distribuir convites; não declarar proteção sem verificar.
28. Na Recovery do DB, confirmar PITR disponível e criar export lógico.
    Guardar fora do repo em armazenamento criptografado; registrar data,
    release, checksum e ponto recuperável sem senha. Não abrir IP público.
29. Ensaiar restore **em novo banco descartável isolado**, com custo aprovado.
    Confirmar destino e major 16; validar migrations, contagens, deploy check
    e smoke numa aplicação isolada. Não repontar nem sobrescrever o DB ativo.
    Seguir `docs/backup-restore.md`; remoção do alvo exige confirmação própria.
30. Aprovar staging somente com CI, build, pre-deploy, HTTPS, health, smoke,
    fluxo autenticado/público, logs e restore evidenciados; dados fictícios,
    zero vulnerabilidades de produção, owner operacional e RPO/RTO registrados.

### Comandos futuros de provisionamento

No ambiente Render configurado, usando a imagem da revisão aprovada:

```sh
npm run pilot:provision -- --organization-name "FixFlow Demo" --organization-slug "fixflow-demo" --owner-name "Owner Demo" --owner-email "owner@example.invalid" --dry-run
```

O dry-run consulta unicidade, mas não cria registros nem token. Para a operação
real, abrir sessão **interativa**, sem gravação, redirect, pipes ou shell trace:

```sh
render ssh <SERVICE_ID> --ephemeral
npm run pilot:provision -- --organization-name "FixFlow Demo" --organization-slug "fixflow-demo" --owner-name "Owner Demo" --owner-email "owner@example.invalid"
```

O email acima é fictício e não recebe mensagens; o fluxo não envia email.
O comando abre `/dev/tty` antes da escrita e mostra o convite somente ali.
Organization, OWNER sem senha, hash do convite e auditoria são criados na
mesma transação. O OWNER define sua senha no fluxo existente. Não colocar
essa operação no pre-deploy nem repetir após sucesso.

### Checklist curto

- [ ] **AÇÃO SEGURA:** preparar login/workspace, conectar GitHub e revisar
  repositório/SHA/Blueprint; parar antes de confirmar contratação.
- [ ] **AÇÃO SEGURA:** conferir região, banco privado, origens exatas, health,
  auto deploy off e responsáveis.
- [ ] **AÇÃO QUE GERA CUSTO:** aprovar plano pago e total mensal; aplicar
  Blueprint para criar banco e web service.
- [ ] **AÇÃO QUE GERA CUSTO:** confirmar URL/origem e executar build/deploy
  manual, considerando consumo de pipeline e recursos ativos.
- [ ] **AÇÃO SEGURA:** testar health/smoke; executar dry-run sem gravar dados.
- [ ] **EXIGE CONFIRMAÇÃO DO ALVO:** provisionar demo e testar os fluxos que
  escrevem somente dados fictícios no staging confirmado.
- [ ] **AÇÃO QUE GERA CUSTO:** export/recovery e novo banco de ensaio, com
  armazenamento protegido e orçamento aprovado.
- [ ] **AÇÃO DESTRUTIVA / EXIGE CONFIRMAÇÃO:** restore com `--clean` apenas no
  alvo descartável identificado; posterior exclusão somente desse alvo.

## Contratos auditados e limitações

O deploy check valida configuração, schema, arquivos de migrations, migrations
aplicadas e tabelas de autenticação/auditoria/rate limit. Não certifica todas
as regras de negócio, privilégios do banco ou ausência de migration parcialmente
aplicada; `prisma migrate deploy` é o gate anterior. Falhas impedem a sequência.
O [pre-deploy do Render](https://render.com/docs/deploys) usa uma instância
separada e requer web pago. Não executar outro job de migration concorrente.

Liveness não consulta banco. Readiness verifica configuração e `SELECT 1`
com timeout; suas respostas são mínimas. A semântica HTTP 200/503 permanece.
Ver [health checks do Render](https://render.com/docs/health-checks).

O smoke faz apenas GETs com timeout em live, ready, home, login e redirect
anônimo de `/app`; verifica headers e sinais de vazamento. Aceita `--base-url`
ou `FIXFLOW_SMOKE_BASE_URL`. Não cria dados e não substitui o QA dos passos
22–27. Nenhuma URL externa foi utilizada nesta preparação.

CI mantém PostgreSQL efêmero `fixflow_ci_test`, migrations, deploy check,
testes determinísticos e integração separada, lint, typecheck, build e diff.
Workflow não alterado. Esta fase não disparou nem observou uma execução remota.

Git e Docker ignoram envs privados, chaves/certificados e backups; modelos
`.env.example`/`.env.staging.example` seguem versionados. Ignore não remove
segredos já rastreados: conferir o diff antes de qualquer commit futuro.

## Validação local e relatório

Os resultados executados, limites e estado final estão em
`docs/phase-10a-validation-report.md`. A aprovação local não é evidência de
deploy, backup, recuperação ou QA externo. O estágio `render` inclui também
ferramentas administrativas e devDependencies; `npm audit --omit=dev` mede
somente a árvore classificada como produção, não toda a imagem nem o SO base.

Não há `.env.staging` configurada neste checkout. Validação Compose com secrets
reais e smoke local completo ficam condicionados a um staging isolado funcional:

```sh
docker compose --env-file .env.staging -f docker-compose.staging.yml config --quiet
```

`--quiet` evita imprimir credenciais expandidas. Não reutilizar `fixflow_dev`,
não destruir volumes e nunca usar `docker compose down -v`.
Sem `FIXFLOW_TEST_DATABASE_URL` separado, integração PostgreSQL é skipped.

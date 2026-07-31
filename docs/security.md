# Security

## Objetivo

Este documento registra a base de seguranca da Fase 8.1 e os controles de
usuarios, convites e sessoes das Fases 8.2A e 8.2B. O foco e preparar o MVP
local para uma futura operacao em producao sem implementar funcionalidades
comerciais.

## Controles ja existentes

- Autenticacao interna por email e senha.
- Senhas armazenadas somente como hash bcryptjs com cost 12.
- Validacao de senha contra truncation silenciosa do bcrypt.
- Sessao opaca persistida no PostgreSQL.
- Cookie de sessao HTTP-only, SameSite=Lax e `secure` em producao.
- Token bruto de sessao nunca persistido no banco; somente `tokenHash`.
- Mensagem generica para credenciais invalidas.
- `AuthenticatedContext` resolvido server-side a partir da sessao.
- Role authorization com OWNER, ADMIN e TECHNICIAN.
- `Organization` como tenant e consultas internas com `organizationId`.
- Repositories tenant-aware para entidades de negocio.
- Portal publico separado do contexto autenticado.
- DTO publico minimo, sem Customer, IDs internos, `organizationId` ou notas
  tecnicas.
- Decisao publica de Quote com transacao e concorrencia otimista.
- Valores monetarios com Prisma Decimal e DTOs como strings canonicas.
- Timeline operacional criada server-side em transacoes criticas.

## Controles adicionados na Fase 8.1

- Cabecalhos HTTP centralizados em `next.config.ts`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy` negando sensores e recursos nao usados.
- Protecao contra framing por `X-Frame-Options: DENY` e CSP
  `frame-ancestors 'none'`.
- Content-Security-Policy inicial compativel com Next.js e React.
- Strict-Transport-Security somente quando `NODE_ENV=production`.
- Rate limiting centralizado para login, consulta publica e decisoes publicas.
- Store em memoria para desenvolvimento/testes, explicitamente inadequada para
  multiplas instancias.
- Store PostgreSQL/Prisma para producao, configurada por variavel de ambiente.
- Chaves de rate limit compostas por hashes, nunca por senha, token ou
  `publicCode` bruto.
- Auditoria de eventos de seguranca em `SecurityAuditLog`.

## Controles adicionados na Fase 8.2A

- Gestao de usuarios exclusiva para OWNER e reautorizada server-side.
- User com `disabledAt`; nao ha exclusao fisica.
- `passwordHash` nullable apenas para conta convidada ainda nao configurada.
- Token de convite aleatorio com 32 bytes; somente SHA-256 e persistido.
- Convite de uso unico, revogavel e com validade de 72 horas.
- Mensagem generica para token invalido, expirado, revogado ou utilizado.
- Consumo atomico do convite e ativacao da conta na mesma transacao.
- Rate limiting por origem na pagina e na action de setup de conta.
- Desativacao e revogacao de todas as sessoes na mesma transacao.
- Sessao revalida existencia e estado ativo do User e a Organization.
- Lock da linha de Organization antes de remover um OWNER ativo.
- Protecao contra alteracao da propria role e desativacao da propria conta.

## Controles adicionados na Fase 8.2B

- Troca da propria senha exige contexto autenticado, senha atual e rate limit.
- A nova senha nao pode ser equivalente a atual.
- Troca e redefinicao de senha revogam todas as sessoes do User no mesmo commit.
- Redefinicao assistida somente por OWNER da mesma Organization.
- Conta alvo deve estar ativa e com senha configurada.
- Token de redefinicao com 32 bytes; somente SHA-256 e persistido.
- Token de uso unico, revogavel e com TTL configuravel.
- Criacao serializada pelo lock da linha do User e constraint parcial para um
  unico token pendente por User e Organization.
- Consumo atomico com claim condicional para impedir dois vencedores
  concorrentes.
- Mensagens publicas genericas para token invalido, expirado, usado, revogado
  ou conta indisponivel.
- Cleanup manual, paginado e idempotente para tabelas de seguranca, com
  dry-run e periodos de retencao configuraveis.

## Modelo basico de ameacas

Principais ameacas consideradas:

- tentativa de enumerar usuarios pelo login;
- tentativa de forca bruta de senha;
- roubo ou exposicao de cookie de sessao;
- persistencia acidental de token bruto de sessao;
- uso de `organizationId` vindo do browser para cruzar tenants;
- uso de User ID de outra Organization em actions administrativas;
- consumo repetido ou concorrente do mesmo convite;
- persistencia ou log acidental do token bruto de convite;
- criacao de redefinicao por papel nao autorizado ou para outro tenant;
- consumo repetido ou concorrente do mesmo token de redefinicao;
- persistencia ou log acidental do token bruto de redefinicao;
- manutencao de sessoes antigas depois de trocar ou redefinir senha;
- manutencao de acesso por sessao depois da desativacao;
- corrida que removeria o ultimo OWNER ativo;
- tentativa de listar ou adivinhar `publicCode`;
- aprovacao ou rejeicao publica repetida ou concorrente;
- vazamento de dados pessoais no portal publico;
- clickjacking contra telas autenticadas ou publicas;
- execucao de conteudo inesperado no browser por CSP ausente;
- vazamento de segredos por logs.

## Riscos conhecidos

- A store em memoria de rate limit so protege uma instancia de processo.
- O rate limit por origem depende de cabecalhos do runtime/proxy e nao substitui
  controles de borda em producao.
- O token aparece necessariamente na URL de setup; proxies e plataformas devem
  aplicar redaction dessa rota em access logs.
- O token de redefinicao tambem aparece na URL; access logs devem ocultar
  `/reset-password/[token]`.
- O projeto ainda nao possui WAF, CAPTCHA, IDS, monitoramento ou alertas.
- Nao ha MFA, verificacao de email ou envio automatico de convite/redefinicao.
- Se o unico OWNER perder acesso, nao existe recuperacao self-service nesta
  fase; gerar o link exige outro OWNER autenticado.
- O cleanup implementado depende de execucao manual ou agendamento externo; a
  aplicacao nao inclui scheduler.
- A CSP inicial permite `unsafe-inline` para compatibilidade com Next.js e
  estilos atuais; uma CSP com nonce pode ser avaliada futuramente.
- Nao ha Row Level Security no PostgreSQL.

## Riscos pendentes

- Definir processo operacional de rotacao de secrets.
- Adicionar monitoramento de eventos de rate limit e falhas de auditoria.
- Definir estrategia de backup com testes periodicos de restauracao.
- Avaliar RLS separadamente, sem alterar a arquitetura atual sem aprovacao.
- Avaliar protecoes adicionais para automacao maliciosa no portal publico.

## Variaveis de ambiente e segredos

- `.env` nunca deve ser versionado.
- `.env.example` deve conter apenas exemplos seguros e ficticios.
- Valores sensiveis nao devem usar prefixo `NEXT_PUBLIC`.
- `DATABASE_URL` de producao deve vir de um gerenciador seguro de secrets do
  ambiente de deploy.
- `FIXFLOW_APP_ENV` deve representar o ambiente logico: `development`, `test`,
  `staging` ou `production`.
- Em producao, `FIXFLOW_RATE_LIMIT_STORE` deve ser `database`.
- Em producao, limites e janelas de cada operacao de rate limit devem estar
  explicitamente configurados.
- Limites e janelas de login, setup de conta, troca de senha, criacao/consumo
  de redefinicao e portal publico usam variaveis `FIXFLOW_RATE_LIMIT_*`.
- `FIXFLOW_PASSWORD_RESET_TOKEN_TTL_MINUTES` define a validade de novos links.
- `FIXFLOW_SECURITY_RETENTION_*` define os periodos de retencao e
  `FIXFLOW_SECURITY_CLEANUP_BATCH_SIZE` limita cada lote.
- Em producao, `FIXFLOW_SECURITY_AUDIT_ENABLED` deve ser `true` e
  `FIXFLOW_SECURITY_AUDIT_STORE` deve ser `database`.
- Configuracao ausente ou insegura em producao deve falhar com erro claro na
  primeira utilizacao relevante.
- Staging recebe os mesmos requisitos persistentes e de retencao de producao.
- URL-base, release, timeout de readiness, decisao de proxy e allowed origins
  sao obrigatorios em ambientes implantados.
- Bootstrap e demo seed habilitado sao recusados pelo runtime implantado.

## Proxy, origins e transporte

`X-Forwarded-For` e `X-Real-IP` so sao considerados quando
`FIXFLOW_TRUST_PROXY=true`. Essa opcao exige trafego exclusivamente por um proxy
confiavel que sobrescreva esses headers. Sem essa garantia, use `false`.

Allowed origins de Server Actions usa hosts exatos separados por virgula, sem
esquema, caminho ou wildcard, e inclui o host da URL-base. Producao exige
URL-base HTTPS. O edge deve redirecionar HTTP e preservar cookies seguros/HSTS.

## Rate limiting

Operacoes protegidas:

- `LOGIN_ATTEMPT`;
- `ACCOUNT_SETUP_ATTEMPT`;
- `PASSWORD_CHANGE_ATTEMPT`;
- `PASSWORD_RESET_CREATE`;
- `PASSWORD_RESET_CONSUME`;
- `PUBLIC_PORTAL_LOOKUP`;
- `PUBLIC_QUOTE_APPROVE`;
- `PUBLIC_QUOTE_REJECT`.

O rate limiting usa janelas fixas. Em PostgreSQL, a tabela
`RateLimitCounter` guarda `operation`, `keyHash`, `windowStart`,
`windowExpiresAt` e `count`. A combinacao
`operation + keyHash + windowStart` e unica. O contador e incrementado com
`upsert`, permitindo uma operacao atomica simples por janela.

Chaves nunca armazenam senha, token de sessao, cookie ou `publicCode` bruto. O
login usa hash do email normalizado. Fluxos publicos de consulta, setup e reset
sao limitados por hash da origem; um hash seguro do codigo/token aparece apenas
como assunto minimizado da auditoria. Operacoes autenticadas de senha usam
hashes de IDs internos confiaveis, sempre combinados com a origem minimizada.

## Retencao e cleanup

O comando `npm run security:cleanup` atua somente em:

- `AuthSession` expirada alem da retencao;
- `UserInvitation` usada, revogada ou expirada alem da retencao;
- `PasswordResetToken` usado, revogado ou expirado alem da retencao;
- `RateLimitCounter` cuja janela encerrou alem da retencao;
- `SecurityAuditLog` anterior ao periodo configurado.

Cada tabela e processada em lotes limitados com CTE, `LIMIT` e
`FOR UPDATE SKIP LOCKED`. Nenhuma entidade de negocio e apagada. O modo
`npm run security:cleanup -- --dry-run` apenas conta registros elegiveis, sem
executar delete. A execucao real repete os lotes ate nao haver elegiveis e pode
ser repetida com resultado zero.

O resultado registra contagens por categoria e um evento
`SECURITY_CLEANUP_EXECUTED`; metadados nao incluem valores das linhas removidas.
O comando e manual. Em producao, o operador deve primeiro revisar o dry-run e
agendar a execucao por mecanismo externo.

## Auditoria de seguranca

Eventos registrados:

- `LOGIN_SUCCEEDED`;
- `LOGIN_REJECTED`;
- `LOGOUT`;
- `RATE_LIMIT_BLOCKED`;
- `USER_INVITED`;
- `USER_INVITATION_REVOKED`;
- `USER_INVITATION_USED`;
- `USER_ROLE_CHANGED`;
- `USER_DISABLED`;
- `USER_REACTIVATED`;
- `USER_SESSIONS_REVOKED`;
- `USER_ADMIN_OPERATION_REJECTED`;
- `PASSWORD_CHANGED`;
- `PASSWORD_RESET_CREATED`;
- `PASSWORD_RESET_TOKEN_REVOKED`;
- `PASSWORD_RESET_COMPLETED`;
- `PASSWORD_RESET_REJECTED`;
- `SECURITY_CLEANUP_EXECUTED`;
- `PUBLIC_QUOTE_APPROVED`;
- `PUBLIC_QUOTE_REJECTED`.

Campos permitidos quando aplicavel:

- tipo do evento;
- resultado;
- data e hora;
- `organizationId` interno;
- `userId` interno;
- hash de identificador sensivel ou publico;
- hash da origem minimizada;
- metadados estritamente necessarios.

Erros de escrita de auditoria nao devem impedir indevidamente operacoes
legitimas. Eles sao reportados com `console.error` usando apenas tipo do evento,
resultado e nome do erro.

Eventos administrativos usam o `userId` do ator autenticado e hash do ID do
User alvo. `USER_INVITATION_USED` usa o hash do token como `subjectHash`; o
token bruto e a senha nunca entram nos metadados.

## Politica de logs

Nunca registrar:

- senha;
- hash de senha;
- cookie;
- token de sessao;
- `tokenHash`;
- token bruto de convite ou link completo de setup;
- token bruto de redefinicao ou link completo de reset;
- `publicCode` bruto;
- cabecalho Authorization;
- conteudo completo de requisicoes;
- dados pessoais desnecessarios.

Nao registrar IP completo sem justificativa documentada. A origem usada nesta
fase e minimizada por hash e serve para correlacao defensiva basica.

## Desenvolvimento, testes e producao

Desenvolvimento:

- pode usar `FIXFLOW_RATE_LIMIT_STORE=memory`;
- deve aplicar migrations antes de testar auditoria em banco;
- pode usar limites previsiveis do `.env.example`.

Testes:

- usam comportamento deterministico por injecao de `now` e store em memoria;
- nao devem depender de ordem global de execucao;
- nao devem registrar secrets reais.

Producao:

- deve usar `FIXFLOW_RATE_LIMIT_STORE=database`;
- deve manter auditoria habilitada em banco;
- deve rodar atras de HTTPS para HSTS e cookies `secure`;
- deve usar secrets reais somente no ambiente seguro de deploy;
- deve executar dry-run antes do cleanup real e agendar o comando por mecanismo
  externo conforme a politica operacional.

## Backup e restauracao

- Backups devem incluir tabelas de negocio, `AuthSession`,
  `PasswordResetToken`, `RateLimitCounter` e `SecurityAuditLog`.
- Restauracao deve ser testada periodicamente em ambiente separado.
- Backups de producao devem ser criptografados e protegidos por acesso minimo.
- Restauracoes nao devem sobrescrever desenvolvimento ou teste sem confirmacao
  explicita.
- Auditoria restaurada pode conter identificadores internos e hashes; trate como
  dado sensivel operacional.

## Checklist de producao

- [ ] `NODE_ENV=production`.
- [ ] `FIXFLOW_APP_ENV=production`.
- [ ] URL-base HTTPS e release SHA correspondem a release.
- [ ] Trusted proxy e allowed origins foram definidos explicitamente.
- [ ] HTTPS configurado antes de expor a aplicacao.
- [ ] `DATABASE_URL` de producao configurada como secret.
- [ ] `FIXFLOW_RATE_LIMIT_STORE=database`.
- [ ] Limites e janelas de rate limit definidos explicitamente.
- [ ] Auditoria habilitada em banco.
- [ ] Migrations aplicadas sem `migrate reset`.
- [ ] Backups configurados e restauracao testada.
- [ ] Retencoes e tamanho de lote definidos explicitamente.
- [ ] Dry-run do cleanup revisado e agendamento externo definido.
- [ ] Logs revisados para ausencia de senha, token e `publicCode` bruto.
- [ ] Access logs aplicam redaction a `/setup-account/[token]`.
- [ ] Access logs aplicam redaction a `/reset-password/[token]`.
- [ ] Revisao de CSP apos qualquer novo asset externo.
- [ ] Monitoramento e alertas planejados.
- [ ] `deploy:check` e `smoke:production` concluidos sem detalhes internos.

## Pendencias recomendadas para fases futuras

- Scheduler/worker para acionar o cleanup existente.
- Observabilidade com metricas de rate limit e falhas de auditoria.
- Revisao de CSP com nonce se o projeto evoluir para uma politica mais estrita.
- Analise separada de Row Level Security.
- MFA e recuperacao autonoma de senha.
- Envio de convite/redefinicao por email sem reintroduzir token em logs.
- CI com migrations, testes e lint.
- Testes E2E para login, logout e portal publico.

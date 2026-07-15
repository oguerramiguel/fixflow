# Security

## Objetivo

Este documento registra a base de seguranca da Fase 8.1 do FixFlow. O foco e
preparar o MVP local para uma futura operacao em producao sem implementar novas
funcionalidades comerciais.

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

## Modelo basico de ameacas

Principais ameacas consideradas:

- tentativa de enumerar usuarios pelo login;
- tentativa de forca bruta de senha;
- roubo ou exposicao de cookie de sessao;
- persistencia acidental de token bruto de sessao;
- uso de `organizationId` vindo do browser para cruzar tenants;
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
- O projeto ainda nao possui WAF, CAPTCHA, IDS, monitoramento ou alertas.
- Nao ha MFA, recuperacao de senha, verificacao de email ou convite de usuarios.
- Nao ha job automatico implementado para limpar sessoes expiradas, contadores
  antigos ou logs de auditoria antigos.
- A CSP inicial permite `unsafe-inline` para compatibilidade com Next.js e
  estilos atuais; uma CSP com nonce pode ser avaliada futuramente.
- Nao ha Row Level Security no PostgreSQL.

## Riscos pendentes

- Definir retencao formal de auditoria por ambiente.
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
- `FIXFLOW_APP_ENV` deve representar o ambiente logico: `development`, `test`
  ou `production`.
- Em producao, `FIXFLOW_RATE_LIMIT_STORE` deve ser `database`.
- Em producao, limites e janelas de cada operacao de rate limit devem estar
  explicitamente configurados.
- Em producao, `FIXFLOW_SECURITY_AUDIT_ENABLED` deve ser `true` e
  `FIXFLOW_SECURITY_AUDIT_STORE` deve ser `database`.
- Configuracao ausente ou insegura em producao deve falhar com erro claro na
  primeira utilizacao relevante.

## Rate limiting

Operacoes protegidas:

- `LOGIN_ATTEMPT`;
- `PUBLIC_PORTAL_LOOKUP`;
- `PUBLIC_QUOTE_APPROVE`;
- `PUBLIC_QUOTE_REJECT`.

O rate limiting usa janelas fixas. Em PostgreSQL, a tabela
`RateLimitCounter` guarda `operation`, `keyHash`, `windowStart`,
`windowExpiresAt` e `count`. A combinacao
`operation + keyHash + windowStart` e unica. O contador e incrementado com
`upsert`, permitindo uma operacao atomica simples por janela.

Chaves nunca armazenam senha, token de sessao, cookie ou `publicCode` bruto. O
login usa hash do email normalizado. O portal publico usa hash do
`publicCode` normalizado quando ele e valido e um hash generico para codigos
invalidos. A origem da operacao tambem e reduzida a hash.

Limpeza recomendada:

```sql
DELETE FROM "RateLimitCounter"
WHERE "windowExpiresAt" < now() - interval '1 day';
```

Em producao, essa limpeza deve virar job agendado do ambiente operacional. O
helper `deleteExpiredRateLimitCounters` existe para ser reaproveitado por um job
futuro.

## Auditoria de seguranca

Eventos registrados:

- `LOGIN_SUCCEEDED`;
- `LOGIN_REJECTED`;
- `LOGOUT`;
- `RATE_LIMIT_BLOCKED`;
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

## Politica de logs

Nunca registrar:

- senha;
- hash de senha;
- cookie;
- token de sessao;
- `tokenHash`;
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
- deve ter rotina de limpeza para rate limit e retencao de auditoria.

## Backup e restauracao

- Backups devem incluir tabelas de negocio, `AuthSession`, `RateLimitCounter` e
  `SecurityAuditLog`.
- Restauracao deve ser testada periodicamente em ambiente separado.
- Backups de producao devem ser criptografados e protegidos por acesso minimo.
- Restauracoes nao devem sobrescrever desenvolvimento ou teste sem confirmacao
  explicita.
- Auditoria restaurada pode conter identificadores internos e hashes; trate como
  dado sensivel operacional.

## Checklist de producao

- [ ] `NODE_ENV=production`.
- [ ] `FIXFLOW_APP_ENV=production`.
- [ ] HTTPS configurado antes de expor a aplicacao.
- [ ] `DATABASE_URL` de producao configurada como secret.
- [ ] `FIXFLOW_RATE_LIMIT_STORE=database`.
- [ ] Limites e janelas de rate limit definidos explicitamente.
- [ ] Auditoria habilitada em banco.
- [ ] Migrations aplicadas sem `migrate reset`.
- [ ] Backups configurados e restauracao testada.
- [ ] Rotina de limpeza de `RateLimitCounter` definida.
- [ ] Retencao de `SecurityAuditLog` definida.
- [ ] Logs revisados para ausencia de senha, token e `publicCode` bruto.
- [ ] Revisao de CSP apos qualquer novo asset externo.
- [ ] Monitoramento e alertas planejados.

## Pendencias recomendadas para fases futuras

- Job agendado para limpeza de contadores e sessoes expiradas.
- Politica formal de retencao de auditoria.
- Observabilidade com metricas de rate limit e falhas de auditoria.
- Revisao de CSP com nonce se o projeto evoluir para uma politica mais estrita.
- Analise separada de Row Level Security.
- MFA e recuperacao de senha.
- CI com migrations, testes e lint.
- Testes E2E para login, logout e portal publico.

# Requirements

## Visao do produto

FixFlow e uma plataforma web para pequenas assistencias tecnicas organizarem o
ciclo de atendimento de notebooks e computadores.

## Problema

Assistencias pequenas frequentemente controlam servicos em planilhas, mensagens
soltas ou papel. Isso dificulta acompanhar status, historico tecnico, orcamentos,
comunicacao com clientes e entrega dos equipamentos.

## Publico-alvo

- pequenas assistencias tecnicas;
- tecnicos independentes com volume recorrente de atendimentos;
- equipes que precisam padronizar diagnostico, orcamento e status de OS.

## Objetivos

- organizar dados de clientes, equipamentos e ordens de servico;
- dar rastreabilidade ao ciclo da manutencao;
- oferecer acompanhamento publico da OS por codigo nao previsivel;
- manter isolamento por Organization para evolucao SaaS;
- sustentar evolucao com testes, documentacao e arquitetura clara.

## Escopo do MVP

- autenticacao de usuarios internos;
- contexto de Organization;
- clientes;
- equipamentos;
- ordens de servico;
- diagnostico;
- orcamentos;
- timeline;
- acompanhamento publico por codigo nao previsivel.
- gestao de usuarios e convites;
- alteracao de senha e redefinicao assistida;
- manutencao manual de dados de seguranca.

## Requisitos funcionais

- RF001: O sistema deve permitir autenticacao de usuarios internos por email e senha.
- RF002: O sistema deve associar usuarios a uma Organization.
- RF003: O sistema deve permitir cadastrar clientes de uma Organization.
- RF004: O sistema deve permitir cadastrar equipamentos vinculados a clientes.
- RF005: O sistema deve permitir abrir ordens de servico para equipamentos.
- RF006: O sistema deve registrar o defeito relatado pelo cliente.
- RF007: O sistema deve permitir registrar diagnostico tecnico.
- RF008: O sistema deve permitir criar orcamentos para ordens de servico.
- RF009: O sistema deve permitir itens de orcamento com quantidade e preco unitario.
- RF010: O sistema deve registrar aprovacao ou rejeicao de orcamento.
- RF011: O sistema deve controlar o status da ordem de servico por transicoes validas.
- RF012: O sistema deve registrar eventos na timeline da ordem de servico.
- RF013: O sistema deve permitir acompanhamento publico por `publicCode`.
- RF014: O sistema deve manter dados de uma Organization isolados de outra.
- RF015: O sistema deve manter sessoes server-side persistidas no PostgreSQL.
- RF016: O sistema deve permitir logout invalidando a sessao no servidor.
- RF017: O sistema deve expor o usuario atual autenticado em `GET /api/me`.
- RF018: O sistema deve construir um contexto autenticado com userId, organizationId e role.
- RF019: O sistema deve diferenciar falha de autenticacao de falha de autorizacao.
- RF020: O sistema deve permitir aprovacao ou rejeicao publica de Quote `SENT`
  por `publicCode`.
- RF021: OWNER deve gerenciar usuarios, roles, status e sessoes da propria
  Organization.
- RF022: O sistema deve permitir convite manual e configuracao segura de conta
  com token de uso unico.
- RF023: Desativar User deve revogar suas sessoes e impedir novos acessos.
- RF024: Usuario autenticado deve poder alterar a propria senha informando a
  senha atual, com revogacao de todas as suas sessoes.
- RF025: OWNER deve poder criar e revogar link manual de redefinicao para User
  ativo da propria Organization.
- RF026: O sistema deve consumir token de redefinicao uma unica vez, atualizar
  a senha e revogar sessoes e tokens pendentes atomicamente.
- RF027: Operador deve poder inspecionar e remover dados de seguranca alem da
  retencao em lotes, com dry-run.
- RF028: A plataforma deve expor liveness sem dependencias e readiness com
  verificacao limitada do PostgreSQL.
- RF029: Operadores devem poder executar preflight e smoke nao destrutivos.
- RF030: Um seed demo completo deve ser idempotente, opt-in e proibido em
  producao.

## Requisitos nao funcionais

- RNF001: O sistema deve usar TypeScript em modo strict.
- RNF002: Regras de dominio devem ser testaveis sem interface React.
- RNF003: O banco principal deve ser PostgreSQL.
- RNF004: O acesso a dados deve ser organizado e centralizado.
- RNF005: Consultas de entidades de negocio devem considerar `organizationId`.
- RNF006: Valores monetarios nao devem usar Float.
- RNF007: O projeto deve possuir testes automatizados relevantes.
- RNF008: O projeto deve possuir lint, typecheck e build verificaveis.
- RNF009: Secrets reais nao devem ser versionados.
- RNF010: A arquitetura deve permitir evolucao gradual para SaaS multiempresa.
- RNF011: Senhas devem ser armazenadas somente como hash usando biblioteca consolidada.
- RNF012: Tokens brutos de sessao nao devem ser persistidos no banco.
- RNF013: Cookies de sessao devem ser HTTP-only, SameSite=Lax e seguros em producao.
- RNF014: `organizationId` confiavel deve vir do User autenticado persistido no servidor.
- RNF015: Respostas HTTP e DTOs nao devem expor `passwordHash`, token bruto ou `tokenHash`.
- RNF016: Operacoes sensiveis devem ter rate limiting centralizado.
- RNF017: Eventos de seguranca devem ser auditados sem armazenar secrets ou
  identificadores publicos brutos.
- RNF018: A aplicacao deve emitir cabecalhos HTTP de seguranca compativeis com
  Next.js e React.
- RNF019: Token bruto de convite nao deve ser persistido, logado ou auditado.
- RNF020: Operacoes de User devem exigir Organization autenticada e impedir
  remocao do ultimo OWNER ativo.
- RNF021: Token bruto de redefinicao nao deve ser persistido, logado ou
  auditado.
- RNF022: Criacao e consumo de redefinicao devem resistir a concorrencia e
  manter isolamento por Organization.
- RNF023: Troca e redefinicao de senha devem ter rate limiting e auditoria
  minimizada.
- RNF024: Cleanup deve ser limitado a tabelas de seguranca, paginado,
  idempotente e configuravel por ambiente.
- RNF025: Staging e producao devem falhar cedo quando configuracao obrigatoria
  ou stores persistentes estiverem ausentes.
- RNF026: O runtime de container deve ser standalone, minimo e non-root, com
  migrations separadas do startup web.
- RNF027: CI deve usar banco de teste isolado, migrations versionadas e
  permissoes minimas, sem deploy.
- RNF028: Releases devem expor identificador seguro sem secrets.

## Status da Fase 2

A Fase 2 implementa autenticacao basica, sessao opaca persistida,
`AuthenticatedContext`, autorizacao simples por role, `/login`, `/app`,
`/api/me`, logout e bootstrap de desenvolvimento. Naquela fase, o escopo ainda
nao incluia cadastro publico, convite de usuarios, recuperacao de senha,
verificacao de email, MFA, CRUDs de negocio ou dashboard com metricas.

## Status da Fase 3

A Fase 3 implementa gerenciamento autenticado e multi-tenant de Customer e
Equipment.

Requisitos funcionais atendidos nesta fase:

- RF003: cadastro, consulta, busca, detalhes e edicao de clientes.
- RF004: cadastro, consulta, busca, detalhes e edicao de equipamentos
  vinculados a clientes.
- RF014: tenant isolation aplicado nas operacoes de Customer e Equipment.

Requisitos nao funcionais reforcados nesta fase:

- RNF004: acesso a dados organizado em repositories concretos.
- RNF005: consultas de entidades de negocio filtradas por `organizationId`.
- RNF007: testes de validacao, services, repositories, delivery e isolamento por
  tenant.
- RNF008: lint, typecheck, testes, build e validacoes Prisma permanecem
  obrigatorios.

Diagnostic, orcamento, portal publico e acompanhamento publico continuam fora
do escopo implementado.

## Status da Fase 4

A Fase 4 implementa gerenciamento inicial de ServiceOrder autenticado e
multi-tenant.

Requisitos funcionais atendidos nesta fase:

- RF005: abertura de ordens de servico a partir de Equipment validado dentro da
  Organization.
- RF006: registro do problema relatado pelo cliente com validacao centralizada.
- RF011: controle de status por workflow server-side e transicoes validas.
- RF012: timeline inicial e timeline de mudanca de status geradas server-side.
- RF014: tenant isolation aplicado nas operacoes de ServiceOrder e timeline.

Requisitos funcionais parcialmente preparados nesta fase:

- RF013: `publicCode` nao previsivel ja e gerado e persistido como unique, mas o
  acompanhamento publico ainda nao foi implementado.

Requisitos nao funcionais reforcados nesta fase:

- RNF004: acesso a dados de ServiceOrder organizado em repository concreto.
- RNF005: consultas de ServiceOrder e timeline filtradas por `organizationId`.
- RNF007: testes de workflow, validacao, services, repositories, delivery,
  concorrencia e isolamento por tenant.
- RNF008: lint, typecheck, testes, build e validacoes Prisma permanecem
  obrigatorios.

Diagnostic, Quote, portal publico, acompanhamento publico, PDF e integracoes
externas continuam fora do escopo implementado.

## Status da Fase 5

A Fase 5 implementa diagnostico tecnico e orcamento interno integrados ao
workflow de ServiceOrder.

Requisitos funcionais atendidos nesta fase:

- RF007: registro e edicao de Diagnostic tecnico enquanto a OS esta em
  `IN_DIAGNOSIS`.
- RF008: criacao explicita de Quote em `DRAFT` para ordens com Diagnostic.
- RF009: criacao, edicao e remocao de QuoteItems em `DRAFT`, com quantidade,
  preco unitario, subtotal e total calculados server-side.
- RF010: registro interno de aprovacao ou rejeicao de orcamento por OWNER ou
  ADMIN.
- RF011: envio, aprovacao e rejeicao de Quote integrados ao workflow real da
  ServiceOrder por transicoes especializadas.
- RF012: timeline registra Diagnostic, Quote criado, Quote enviado, Quote
  aprovado, Quote rejeitado e mudancas de status correspondentes.
- RF014: tenant isolation aplicado nas operacoes de Diagnostic, Quote,
  QuoteItem, ServiceOrder e timeline.

Requisitos nao funcionais reforcados nesta fase:

- RNF004: acesso a dados de Diagnostic e Quote organizado em repositories
  concretos.
- RNF005: consultas de Diagnostic, Quote e QuoteItem filtradas por
  `organizationId`.
- RNF006: valores monetarios usam `Prisma.Decimal`; DTOs monetarios usam strings
  canonicas e a UI formata BRL a partir dessas strings.
- RNF007: testes de Decimal, money parsing, Diagnostic, Quote lifecycle,
  autorizacao, concorrencia, transacoes e tenant isolation.
- RNF008: lint, typecheck, testes, build e validacoes Prisma permanecem
  obrigatorios.

Naquela fase, continuavam fora do escopo implementado:

- portal publico;
- aprovacao publica;
- envio automatico de e-mail ou WhatsApp;
- PDF;
- pagamentos.

## Status da Fase 6

A Fase 6 implementa acompanhamento publico de ServiceOrder por `publicCode`.

Requisitos funcionais atendidos nesta fase:

- RF010: aprovacao e rejeicao de orcamento agora podem ocorrer tambem pelo
  portal publico quando Quote esta em `SENT` e a OS esta em
  `WAITING_FOR_APPROVAL`.
- RF012: timeline registra decisao publica de Quote e mudanca de status de
  forma atomica.
- RF013: acompanhamento publico por `publicCode` implementado em
  `/track/[publicCode]`.
- RF014: o portal publico nao recebe `organizationId` e nao expoe tenant,
  Customer ou IDs internos.
- RF020: decisao publica de Quote implementada com DTO publico minimo,
  transacao e concorrencia otimista.

Requisitos nao funcionais reforcados nesta fase:

- RNF004: acesso publico organizado em repository concreto separado.
- RNF006: valores monetarios continuam como Decimal no servidor e strings
  canonicas no DTO.
- RNF007: testes cobrem validacao de `publicCode`, DTO publico, query publica,
  timeline publica, quote publico, decisao publica, conflito e actions.
- RNF008: lint, typecheck, testes, build e validacoes Prisma permanecem
  obrigatorios.

Continuam fora do escopo implementado:

- login de cliente;
- envio automatico de e-mail ou WhatsApp;
- PDF;
- pagamentos.

## Status da Fase 8.1

A Fase 8.1 implementa a base de seguranca e preparacao para producao sem novas
funcionalidades comerciais.

Requisitos nao funcionais reforcados nesta fase:

- RNF007: testes adicionados para rate limit, auditoria e cabecalhos.
- RNF008: validacoes locais continuam obrigatorias.
- RNF009: `.env.example` contem apenas exemplos seguros.
- RNF016: rate limiting aplicado ao login, consulta publica e decisoes publicas.
- RNF017: auditoria registra login, logout, bloqueios de rate limit e decisoes
  publicas sem senha, cookie, token ou `publicCode` bruto.
- RNF018: headers HTTP de seguranca e CSP inicial adicionados centralmente.

Naquela fase, continuavam fora do escopo implementado:

- recuperacao de senha;
- envio de email;
- MFA;
- deploy;
- WAF, CAPTCHA e observabilidade de producao;
- Row Level Security.

## Status da Fase 8.2A

A Fase 8.2A implementa gestao de usuarios, convites e sessoes:

- RF021: OWNER lista e altera somente Users da propria Organization;
- RF022: convite manual com token aleatorio, hash persistido, expiracao de 72
  horas, revogacao, reemissao e setup de senha pelo convidado;
- RF023: User desativado nao autentica, sessoes antigas deixam de autorizar e
  desativacao remove todas as AuthSession;
- RNF019: auditoria e rate limit usam hashes, sem senha ou token bruto;
- RNF020: actions e services reautorizam OWNER, repositories filtram tenant e
  lock transacional protege o ultimo OWNER ativo.

Naquela fase, continuavam fora do escopo:

- envio de email;
- recuperacao de senha;
- MFA;
- verificacao de email;
- usuario em multiplas Organizations.

## Status da Fase 8.2B

A Fase 8.2B implementa ciclo de senha e manutencao de seguranca:

- RF024: OWNER, ADMIN e TECHNICIAN alteram a propria senha com verificacao da
  senha atual e revogacao atomica de todas as sessoes;
- RF025: OWNER gera ou revoga link manual somente para User ativo do mesmo
  tenant;
- RF026: token de 32 bytes e persistido apenas como SHA-256, expira, e de uso
  unico e possui claim atomico com um unico vencedor concorrente;
- RF027: cleanup manual possui dry-run, retencoes configuraveis e deletes em
  lotes apenas nas tabelas de seguranca;
- RNF021: senha, token bruto e link completo ficam fora de banco, logs e
  auditoria;
- RNF022: relations compostas, lock do User e indice unique parcial protegem
  tenant e concorrencia;
- RNF023: troca, criacao e consumo possuem rate limiting e eventos de auditoria;
- RNF024: cleanup e paginado, repetivel e preserva entidades de negocio.

Continuam fora do escopo:

- recuperacao autonoma por email;
- recuperacao operacional do unico OWNER bloqueado;
- envio automatico de convite ou redefinicao;
- MFA e verificacao de email;
- scheduler/worker embutido;
- usuario em multiplas Organizations.

## Status da Fase 9A

A Fase 9A implementa readiness de staging/producao sem escolher provedor ou
executar deploy real:

- RF028: health separado, com timeout e respostas seguras;
- RF029: `deploy:check` e `smoke:production` nao destrutivos;
- RF030: seed demo ficticio, sem delete, condicionado a flag e proibido em
  producao;
- RNF025: runtime central para development, test, staging e production;
- RNF026: Docker multi-stage non-root e job separado de migrations;
- RNF027: GitHub Actions valida Prisma, testes, PostgreSQL, lint, typecheck,
  build e diff sem deploy;
- RNF028: health e startup identificam versao e release SHA.

Continuam fora do escopo: provedor, infraestrutura real, CD, dominio publico,
TLS gerenciado, observabilidade contratada e execucao real de backup/restore.

## Status da Fase 9B

A Fase 9B prepara, mas nao executa, um staging publico controlado:

- RF031: um operador autorizado provisiona Organization, primeiro OWNER e
  convite de configuracao sem aceitar tenant ID do cliente ou criar senha
  temporaria;
- RNF029: o provisionamento inicial e atomico, auditavel, armazena somente o
  hash do token e nao envia o link one-time aos logs do servico;
- Render foi escolhido e declarado em `render.yaml` com migracao unica,
  deploy-check e readiness, sem seed automatico;
- conta, cobranca, deploy, dominio, restore e dados ficticios permanecem
  pendencias manuais e nao sao afirmados como executados.

## Fora do escopo inicial

- cadastro publico de usuarios;
- recuperacao autonoma de senha;
- verificacao de email;
- MFA;
- CRUDs completos;
- dashboard funcional;
- envio de e-mails;
- geracao de PDF;
- pagamentos;
- integracoes com IA;
- Row Level Security no banco.

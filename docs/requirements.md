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
- preparar acompanhamento publico da OS;
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
- RF013: O sistema deve permitir acompanhamento publico futuro por `publicCode`.
- RF014: O sistema deve manter dados de uma Organization isolados de outra.
- RF015: O sistema deve manter sessoes server-side persistidas no PostgreSQL.
- RF016: O sistema deve permitir logout invalidando a sessao no servidor.
- RF017: O sistema deve expor o usuario atual autenticado em `GET /api/me`.
- RF018: O sistema deve construir um contexto autenticado com userId, organizationId e role.
- RF019: O sistema deve diferenciar falha de autenticacao de falha de autorizacao.

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

## Status da Fase 2

A Fase 2 implementa autenticacao basica, sessao opaca persistida,
`AuthenticatedContext`, autorizacao simples por role, `/login`, `/app`,
`/api/me`, logout e bootstrap de desenvolvimento. O escopo ainda nao inclui
cadastro publico, convite de usuarios, recuperacao de senha, verificacao de
email, MFA, CRUDs de negocio ou dashboard com metricas.

## Fora do escopo inicial

- cadastro publico de usuarios;
- recuperacao ou redefinicao de senha;
- verificacao de email;
- MFA;
- CRUDs completos;
- dashboard funcional;
- portal publico;
- envio de e-mails;
- geracao de PDF;
- pagamentos;
- integracoes com IA;
- Row Level Security no banco.

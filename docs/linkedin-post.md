# LinkedIn post draft

## Versao curta

Conclui uma nova fase do FixFlow, um projeto de portfolio em Next.js para gestao
de assistencias tecnicas de notebooks e computadores.

Nesta etapa, foquei em deixar o repositorio mais claro para leitura tecnica:
README profissional, documentacao de setup local, checklist de QA manual,
explicacao de arquitetura e roteiro de demonstracao.

O MVP ja cobre autenticacao interna, clientes, equipamentos, ordens de servico,
diagnostico, orcamento, timeline, multi-tenancy por Organization e portal
publico por codigo de acompanhamento.

Ainda nao e um produto em producao. A ideia e mostrar evolucao incremental,
cuidado com regras de dominio, isolamento de dados, transacoes e testes
automatizados.

Stack: Next.js, TypeScript, Prisma, PostgreSQL, Tailwind CSS e Vitest.

## Versao media

Estou construindo o FixFlow como projeto de portfolio: uma plataforma web
multi-tenant para pequenas assistencias tecnicas gerenciarem clientes,
equipamentos, ordens de servico, diagnosticos e orcamentos.

A proposta e resolver um problema bem comum em negocios pequenos: acompanhar
atendimentos que normalmente ficam espalhados entre planilhas, mensagens e papel.

O MVP local ja possui:

- autenticacao interna com sessao opaca;
- Organization como tenant;
- CRUD de clientes e equipamentos sem delete;
- abertura e acompanhamento de ordens de servico;
- workflow de status com timeline;
- diagnostico tecnico;
- orcamento com itens e calculo monetario usando Decimal;
- aprovacao/rejeicao interna;
- portal publico por `publicCode`;
- aprovacao/rejeicao publica de orcamento;
- testes automatizados.

Nesta fase, meu foco foi polir o repositorio para leitura de recrutadores,
professores e colegas: README mais profissional, documentacao de desenvolvimento
local, checklist de QA manual, notas de portfolio e um roteiro claro de
demonstracao.

Alguns pontos tecnicos que gostei de trabalhar:

- isolamento por `organizationId`;
- `organizationId` resolvido no servidor, nunca vindo do browser;
- DTO publico minimo separado dos DTOs internos;
- transacoes Prisma para manter status e timeline consistentes;
- concorrencia otimista em fluxos de aprovacao;
- dinheiro tratado com `Prisma.Decimal`, nao `number`;
- protecao contra truncation silenciosa no bcryptjs.

O projeto ainda nao tem deploy publico, CI/CD, PDF, pagamento ou envio real de
email/WhatsApp. Esses itens ficaram como roadmap honesto para fases futuras.

Stack principal: Next.js, React, TypeScript, Tailwind CSS, Prisma, PostgreSQL,
Docker Compose, Vitest e ESLint.

## Sugestao de fechamento

Se eu fosse apresentar o projeto em entrevista, destacaria tres decisoes:

1. multi-tenancy desde o inicio;
2. workflows de dominio testaveis fora da interface;
3. portal publico limitado por `publicCode`, sem expor dados internos.

## Hashtags opcionais

#nextjs #typescript #prisma #postgresql #softwareengineering #portfolio

# Fase 9D — Product Polish, UX Intelligence e QA

Fechamento: 5 de outubro de 2026. Trabalho local, sem commit, push, PR ou deploy.
Este registro consolida o QA anterior desta conversa e a rodada final após a
inclusão de Link público e a atualização das dependências.

## 1. Estado inicial

- Repositório: `C:\Projetos\fixflow`.
- Branch: `feat/phase-9d-product-polish`.
- HEAD preservado: `c414b07b0568bea01b0db643c6144d5dc342112b`.
- A Fase 9C já fornecia identidade visual, temas, shell, dashboard e portal.
- O início da Fase 9D tinha working tree limpo. Nas retomadas, todo o diff
  existente foi inspecionado e preservado; a implementação não foi reiniciada.
- Checkpoint anterior: busca, teclado, toasts e parte do QA concluídos, com
  423 testes passando. As duplicações de atributos ARIA foram corrigidas.
- Na última retomada faltavam Link público, fechamento do QA, validações,
  revisão integral e documentação. Esses itens foram tratados nesta entrega.

## 2. Problemas encontrados — P0/P1/P2

| Prioridade | Evidência | Tratamento |
| --- | --- | --- |
| P0 | Nenhum problema grave confirmado na investigação inicial de UX | Sem mudança de regras de domínio |
| P0 posterior | Audit de 2/10 identificou dependências vulneráveis, incluindo Next.js crítico | Versões corrigidas e nova regressão completa |
| P1 pendente | Audit de 5/10 identificou sete alertas altos derivados de braces nas ferramentas de desenvolvimento | Sem versão corrigida publicada; produção sem alertas; risco registrado abaixo |
| P1 | Ausência de busca transversal; equipamento prometia busca por cliente sem consultar seu nome | Busca autenticada e consulta de equipamento corrigida |
| P1 | Nova OS exigia ir à lista e ao detalhe do equipamento | Seleção direta cliente → equipamento → problema |
| P1 | Redirects de sucesso sem confirmação visível | Toasts permitidos e removíveis |
| P1 | Drawer sem Escape/restauração de foco | Dialog nativo compartilhado |
| P1 | Tabelas largas e progresso público com largura mínima no celular | Cards responsivos e progresso em grade |
| P1 | Caminho diagnóstico → orçamento e consequência do envio pouco claros | CTAs, instruções e confirmações |
| P2 | H2 como título de página, botões e textos inconsistentes | H1, tokens, alvos e microcopy |
| P2 | Token brand-950 ausente; toast translúcido sobre texto | Token adicionado e superfície opaca |
| P2 | Tabela de usuários apertada em 768 px; cabeçalho recolhido comprimido | Cards até 1023 px e expansão com alvo de 44 px |

## 3. Mudanças implementadas

Busca, atalhos, feedback, loading, erros recuperáveis, navegação guiada da OS,
confirmações, responsividade, associações ARIA e seção Link público. Mantida a
arquitetura de Server Components, services e repositories existentes. As
alterações visuais complementam a Fase 9C; não constituem outro redesign.

## 4. Busca global

`GET /api/search` exige contexto autenticado do servidor e ignora qualquer
organizationId recebido do browser. Pesquisa clientes, equipamentos e OS, com
termos combinados, até cinco resultados por categoria e ordenação determinística.
Nome, marca/modelo, série e código podem localizar os respectivos registros.
Entrada mínima de dois caracteres, máxima de cem; whitespace normalizado.
DTO mínimo de navegação, cache privado desabilitado e erros sem detalhes internos.
Testes verificam os filtros de duas organizações e das relações consultadas.

## 5. Command palette

Carregada sob demanda. Ctrl/Cmd+K abre/fecha; setas selecionam; Enter navega;
Escape fecha e restaura foco. Combobox/listbox, indicação de seleção, região de
status, estados de busca/vazio/erro e nova tentativa. Debounce de 250 ms e
AbortController evitam consultas por tecla e respostas obsoletas. Oito atalhos:
nova OS, novo cliente, novo equipamento, dashboard, ordens, clientes,
equipamentos e Minha conta.

## 6. Feedback e toasts

Quatorze mensagens fechadas cobrem criação/edição, diagnóstico, itens, envio,
aprovação/rejeição e status. São exibidas após redirects bem-sucedidos, podem ser
dispensadas e não desaparecem por tempo. Novo submit remove o sucesso anterior.
`notice` é apenas apresentação e não autoriza ações. Convites, ações de usuários
e senha mantêm seus feedbacks existentes. Botões operacionais compartilham
pending/disabled/aria-busy. Erros preservam valores e têm associação com campos.
O toast “Link copiado” só aparece após a promessa do clipboard concluir; remove
um eventual toast anterior. Falha de clipboard oferece seleção/cópia manual.

## 7. Loading e skeletons

Loading de dashboard, clientes, equipamentos, ordens, usuários, conta e portal,
com componente reutilizável, status acessível e animação condicionada a reduced
motion. Error boundaries interno e público oferecem nova tentativa e mensagens
seguras; o público não aponta para áreas internas. Não foram adicionados atrasos
artificiais para tornar skeletons visíveis.

## 8. Empty states

Dashboard e lista de ordens conduzem à primeira OS. Seletores explicam a
necessidade de cliente/equipamento e oferecem cadastro. Orçamento sem itens
orienta o preenchimento e mantém envio desabilitado. Busca sem resultados
explica como tentar novamente. Filtros existentes mantêm ação de limpar.
Equipe e portal têm orientação contextual, sem dados fictícios.

## 9. Fluxo de OS e Link público

`/app/service-orders/new` apresenta três etapas, reutilizando os serviços
tenant-aware. IDs recebidos são revalidados; customerId da criação continua
derivado do equipamento no servidor. Troca de cliente/equipamento e dicas do
problema reduzem retornos à listagem. Transições e timeline não mudaram.

A seção “Link público” usa o publicCode persistido e a base validada por
`getRuntimeConfig().appBaseUrl` / `FIXFLOW_APP_BASE_URL`. Exibe URL completa em
campo selecionável, “Copiar link” e “Abrir portal” em nova aba. A cópia inclui
protocolo, host, porta quando aplicável e `/track/[publicCode]`. O componente
recebe apenas essa URL. Não cria token, rota pública, autorização ou ID interno
no link. No QA local, a base do processo foi `http://127.0.0.1:3000`; configurações
de staging/produção continuam validadas pelo módulo existente.

## 10. Diagnóstico e orçamento

CTA para continuar após salvar diagnóstico, indicação de notas técnicas
internas, explicação do rascunho e do envio manual do link. Envio, decisões e
cancelamento selecionados recebem confirmação. Itens permanecem editáveis
somente em DRAFT. O envio informa que não dispara email/mensagem automaticamente.
O portal apresenta o resultado aprovado/rejeitado e os próximos passos.
Nenhum novo estado, cálculo monetário ou regra transacional foi introduzido.

## 11. Mobile

Desktop 1440 px, tablet 768 px, celulares 390 e 375 px nos dois temas. Dashboard,
equipe e orçamento interno usam cards até 1023 px. Progresso público usa três
colunas no celular e seis a partir de sm. Campos, botões, drawer, palette e
Link público foram inspecionados. Não houve overflow horizontal da página nas
combinações registradas; campos de URL longa permitem seleção e rolagem interna.

## 12. Acessibilidade

Skip link, foco visível, foco no conteúdo após navegação, Escape/restauração,
dialog modal nativo, labels, H1 por página, status ao salvar/copiar, aria-invalid
e aria-describedby nos formulários operacionais. Duplicações ARIA eliminadas.
Alvos principais e botão Copiar link com 44 px. Badges incluem texto; status não
depende apenas de cor. Reduced motion foi revisado no CSS, sem animação obrigatória.
Verificação por teclado e árvore/DOM; não é certificação WCAG nem teste com
leitor de tela real. O navegador pode levar Tab à sua própria barra, sem liberar
interação com o conteúdo de fundo do dialog.

## 13. Dark mode

Inspeção das áreas principais e formulários em claro/escuro. Correção de
brand-950 no total do orçamento, foco, sucesso/erro e botões. Toast com fundo
opaco evita mistura com o conteúdo atrás. Superfícies e tipografia da Fase 9C
foram preservadas.

## 14. Performance

Palette carregada sob demanda; nenhum pacote de UI, busca, toast ou gráfico foi
adicionado. Páginas continuam server-rendered. Consultas de busca têm select
mínimo e limite, executadas em paralelo, com debounce e cancelamento no cliente.
Não há benchmark de produção, teste de carga ou alegação quantitativa de ganho.
`contains` ainda pode exigir varredura em bases grandes; não foi criado índice
ou motor de busca fora do escopo.

## 15. QA feito no navegador

Navegador integrado Chromium, aplicação e PostgreSQL locais. O QA anterior
totalizou 136 combinações: dez áreas × dois temas × quatro larguras (80), seis
formulários/etapas × dois temas × quatro larguras (48) e login (8). Após atualizar
dependências, as 80 combinações principais e as oito do login foram repetidas:
nenhum overflow de página, nenhum campo visível sem label nas áreas examinadas
e nenhum erro no console na rodada final. Inspeções visuais representativas
complementaram as medições de DOM; não se trata de 224 screenshots.

| Área/ação | Evidência executada |
| --- | --- |
| Login/logout | Login local, logout e redirect de /app para /login |
| Dashboard/listagens | Conteúdo persistido, filtros vazios, layouts e temas |
| Clientes/equipamentos | Cadastro sintético, atualização e toasts; valores preservados |
| OS | Seleção em três etapas, criação e feedback; etapas repetidas após atualização |
| Diagnóstico | Registro e continuidade para orçamento |
| Orçamento | DRAFT, envio desabilitado sem itens, inclusão/edição, valor inválido 1e2 rejeitado, 2 × 120,50 = 241,00 |
| Confirmações | Voltar preserva estado; confirmar envio/decisão executa ação |
| Aprovação pública | Decisão registrada, botões removidos, OS/timeline refletidas internamente |
| Workflow | OS aprovada avançou por manutenção, testes, retirada e conclusão |
| Rejeição pública | Segunda OS rejeitada e cancelada; resultado permanece no portal |
| Usuários/conta | UI, labels, responsividade, indicação de proteção da própria função e aviso de encerramento de sessões |
| Busca/teclado | Marcio, Dell Inspiron, código de OS, vazio, Ctrl/Cmd+K, setas, Enter, Escape e foco |
| Link público | Mouse e Enter, URL completa conferida no clipboard, toast único, alvo 44 px, nova aba e portal sem sessão |
| Privacidade pública | Ausência de contato do cliente, série, notas técnicas e IDs internos no conteúdo visível examinado |

Foram usados registros sintéticos identificados como QA 9D, incluindo as ordens
`FF-LQZWQV9H42` (concluída/aprovada) e `FF-GCSH5NDHH4` (cancelada/rejeitada).
Esses registros permanecem no banco local. Não houve reset, seed ou alteração
de registros operacionais preexistentes. Capturas reais de Link público foram
salvas fora do repositório e entregues na conversa.

Convites, mudanças de função, revogações e troca/reset de senha não foram
executados manualmente sobre contas reais. Seus testes de comportamento,
permissões, sessão e segurança compõem a regressão automatizada. Não foram
simulados manualmente bloqueio de clipboard, falha de rede, leitor de tela ou
falha de banco. Essas limitações não são apresentadas como QA manual concluído.

## 16. Testes e validação final

Validação repetida em 5/10/2026. Runtime: Node **22.14.0**, npm **10.9.2**.
Suíte: **432 passaram, 7 ignorados**,
77 arquivos passaram e 2 foram ignorados. As adições cobrem busca por tenant,
DTO mínimo, autenticação, cache, validação, lista fechada de notices, redirects,
seleção de cliente/equipamento e base/código/isolamento do link público.

| Comando | Resultado final |
| --- | --- |
| `npm ci` | Passou; 435 pacotes instalados, 436 auditados; sete alertas detalhados abaixo |
| `npm run prisma:generate` | Passou; Prisma Client 6.10.1 |
| `npm run prisma:validate` | Passou |
| `npm run prisma:format` | Passou; nenhum diff no schema |
| `npm run test` | Passou; 432 testes, 7 ignorados |
| `npm run lint` | Passou, sem erros ou avisos |
| `npm run typecheck` | Passou |
| `npm run build` | Passou; Next 16.3.8, 18 páginas estáticas geradas |
| `npm audit` | Executado; exit 1, sete alertas altos na cadeia de ferramentas de desenvolvimento |
| `npm audit --omit=dev` | Passou; zero vulnerabilidades |
| `git diff --check` | Passou |

O servidor local foi interrompido durante a instalação para liberar a DLL do
Prisma e foi restabelecido ao final, disponível em http://localhost:3000. O Next dev regenerou os imports de tipos de next-env.d.ts para .next/dev/types, conforme seu comportamento normal. Tentativas no sandbox encontraram EPERM/Access denied em realpath e
canonicalização; os comandos afetados foram repetidos com permissão fora do
sandbox e passaram. Isso não exigiu alterar código, banco ou testes.

Os sete testes PostgreSQL de integração foram explicitamente ignorados por
ausência de `FIXFLOW_TEST_DATABASE_URL` separado e seguro. O QA usa o banco de
desenvolvimento; não substitui testes de integração isolados. A suíte existente
cobre auth/logout, OWNER, rate limit, auditoria, sessões, reset, dinheiro,
workflow, decisões públicas e concorrência por testes unitários/repositories.

## 17. Dependências

- Next.js e eslint-config-next: 16.2.12 → 16.3.8.
- sharp (override): 0.35.0 → 0.35.4.
- Vitest: 3.2.7 → 4.1.11, versão corrigida; a suíte passou sem alterar suas regras.
- Vite mantido em 7.3.6 por override: evita a falha `edgesOut` do npm 10.9.2
  na resolução de peers opcionais de Vite 8, sem ignorar peers ou usar force.
- Lockfile atualiza browserslist e suas bases, js-yaml e brace-expansion; outras
  alterações transitivas decorrem das versões corrigidas.
- Prisma/client, React, TypeScript e versões de runtime permanecem iguais.
- `agentRules: false` desativa a nova escrita automática de instruções pelo
  Next dev; AGENTS.md foi preservado. Não altera autenticação nem autorização.

Motivação: [advisory do Next em Windows](https://github.com/advisories/GHSA-p293-qw3h-jr36),
[advisory de ImageResponse](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) e
[advisory do Vitest](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), além dos
alertas transitivos identificados pelo npm audit. Nenhum audit fix --force.

Na conferência de **5/10**, o resultado mudou em relação ao checkpoint de 2/10:
`npm audit` retornou **sete alertas altos**, todos derivados de
[GHSA-vfj7-8cjw-p6xm em braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
O advisory informa que não existe versão corrigida. A árvore afetada inclui
braces, micromatch, fast-glob, chokidar, Tailwind CSS, o plugin e a configuração
ESLint do Next. São dependências de desenvolvimento; `npm audit --omit=dev`
retornou **zero**. As sugestões automáticas envolvem migrar Tailwind 3 para 4
e rebaixar eslint-config-next para 14, mudanças incompatíveis com uma correção
pontual desta fase. Nenhuma foi aplicada. A pendência permanece explícita;
não se afirma que a auditoria completa passou. A aplicação não encaminha
entradas do usuário a essas ferramentas, conforme revisão dos imports; isso
limita a exposição identificada, sem eliminar o risco nas ferramentas.

## 18. Arquivos novos

```text
docs/phase-9d-product-polish.md
src/app/api/search/route.ts
src/app/app/customers/loading.tsx
src/app/app/equipment/loading.tsx
src/app/app/error.tsx
src/app/app/loading.tsx
src/app/app/service-orders/loading.tsx
src/app/app/service-orders/new/page.tsx
src/app/app/settings/account/loading.tsx
src/app/app/settings/users/loading.tsx
src/app/track/[publicCode]/error.tsx
src/app/track/[publicCode]/loading.tsx
src/components/ui/action-notice.tsx
src/components/ui/command-palette.tsx
src/components/ui/confirmable-form.tsx
src/components/ui/modal.tsx
src/components/ui/page-loading.tsx
src/components/ui/public-link-panel.tsx
src/components/ui/submit-button.tsx
src/lib/action-notices.ts
src/lib/global-search.ts
src/server/repositories/global-search-repository.ts
src/server/services/global-search-service.ts
tests/app/action-notices.test.ts
tests/app/global-search-route.test.ts
tests/app/new-service-order-page.test.ts
tests/app/service-order-public-link.test.ts
tests/server/global-search-repository.test.ts
tests/server/global-search-service.test.ts
```

## 19. Arquivos modificados

```text
README.md
docs/architecture.md
docs/manual-qa.md
docs/ui-design-system.md
next-env.d.ts
next.config.ts
package-lock.json
package.json
src/app/app/customers/[customerId]/edit/page.tsx
src/app/app/customers/[customerId]/page.tsx
src/app/app/customers/actions.ts
src/app/app/customers/customer-form.tsx
src/app/app/customers/new/page.tsx
src/app/app/equipment/[equipmentId]/edit/page.tsx
src/app/app/equipment/[equipmentId]/page.tsx
src/app/app/equipment/[equipmentId]/service-orders/new/page.tsx
src/app/app/equipment/actions.ts
src/app/app/equipment/equipment-form.tsx
src/app/app/equipment/new/page.tsx
src/app/app/layout.tsx
src/app/app/page.tsx
src/app/app/service-orders/[serviceOrderId]/diagnostic/actions.ts
src/app/app/service-orders/[serviceOrderId]/diagnostic/diagnostic-form.tsx
src/app/app/service-orders/[serviceOrderId]/diagnostic/page.tsx
src/app/app/service-orders/[serviceOrderId]/page.tsx
src/app/app/service-orders/[serviceOrderId]/quote/actions.ts
src/app/app/service-orders/[serviceOrderId]/quote/items/[quoteItemId]/edit/page.tsx
src/app/app/service-orders/[serviceOrderId]/quote/page.tsx
src/app/app/service-orders/[serviceOrderId]/quote/quote-command-forms.tsx
src/app/app/service-orders/[serviceOrderId]/quote/quote-item-form.tsx
src/app/app/service-orders/actions.ts
src/app/app/service-orders/page.tsx
src/app/app/service-orders/service-order-form.tsx
src/app/app/service-orders/status-actions.tsx
src/app/app/settings/account/page.tsx
src/app/app/settings/users/invitation-link-panel.tsx
src/app/app/settings/users/invite-user-form.tsx
src/app/app/settings/users/page.tsx
src/app/app/settings/users/password-reset-link-panel.tsx
src/app/app/settings/users/user-actions.tsx
src/app/globals.css
src/app/track/[publicCode]/page.tsx
src/app/track/[publicCode]/public-quote-decision-form.tsx
src/components/ui/app-shell.tsx
src/components/ui/primitives.tsx
src/server/repositories/equipment-repository.ts
tailwind.config.ts
tests/app/delivery-actions.test.ts
tests/server/equipment-repository.test.ts
```

## 20. Git diff --stat

A saída abaixo cobre arquivos já rastreados. Arquivos novos continuam untracked,
listados na seção 18; nenhum arquivo foi staged para inflar a estatística.

```text
 README.md                                          |    4 +-
 docs/architecture.md                               |   22 +
 docs/manual-qa.md                                  |   13 +
 docs/ui-design-system.md                           |   22 +
 next-env.d.ts                                      |    3 +-
 next.config.ts                                     |    2 +
 package-lock.json                                  | 1206 ++++++++++----------
 package.json                                       |    9 +-
 src/app/app/customers/[customerId]/edit/page.tsx   |    4 +-
 src/app/app/customers/[customerId]/page.tsx        |   12 +-
 src/app/app/customers/actions.ts                   |    4 +-
 src/app/app/customers/customer-form.tsx            |   49 +-
 src/app/app/customers/new/page.tsx                 |    2 +-
 src/app/app/equipment/[equipmentId]/edit/page.tsx  |    6 +-
 src/app/app/equipment/[equipmentId]/page.tsx       |   18 +-
 .../[equipmentId]/service-orders/new/page.tsx      |   10 +-
 src/app/app/equipment/actions.ts                   |    4 +-
 src/app/app/equipment/equipment-form.tsx           |   64 +-
 src/app/app/equipment/new/page.tsx                 |   33 +-
 src/app/app/layout.tsx                             |    5 +-
 src/app/app/page.tsx                               |   12 +-
 .../[serviceOrderId]/diagnostic/actions.ts         |    2 +-
 .../diagnostic/diagnostic-form.tsx                 |   38 +-
 .../[serviceOrderId]/diagnostic/page.tsx           |   13 +-
 .../app/service-orders/[serviceOrderId]/page.tsx   |    7 +-
 .../[serviceOrderId]/quote/actions.ts              |   14 +-
 .../quote/items/[quoteItemId]/edit/page.tsx        |   10 +-
 .../service-orders/[serviceOrderId]/quote/page.tsx |   63 +-
 .../[serviceOrderId]/quote/quote-command-forms.tsx |   23 +-
 .../[serviceOrderId]/quote/quote-item-form.tsx     |   51 +-
 src/app/app/service-orders/actions.ts              |    4 +-
 src/app/app/service-orders/page.tsx                |    4 +-
 src/app/app/service-orders/service-order-form.tsx  |   34 +-
 src/app/app/service-orders/status-actions.tsx      |    7 +-
 src/app/app/settings/account/page.tsx              |    2 +-
 .../app/settings/users/invitation-link-panel.tsx   |    4 +-
 src/app/app/settings/users/invite-user-form.tsx    |   14 +-
 src/app/app/settings/users/page.tsx                |   24 +-
 .../settings/users/password-reset-link-panel.tsx   |    4 +-
 src/app/app/settings/users/user-actions.tsx        |   22 +-
 src/app/globals.css                                |   37 +-
 src/app/track/[publicCode]/page.tsx                |   10 +-
 .../[publicCode]/public-quote-decision-form.tsx    |    5 +-
 src/components/ui/app-shell.tsx                    |   57 +-
 src/components/ui/primitives.tsx                   |    2 +-
 src/server/repositories/equipment-repository.ts    |    6 +
 tailwind.config.ts                                 |    3 +-
 tests/app/delivery-actions.test.ts                 |   24 +-
 tests/server/equipment-repository.test.ts          |   18 +
 49 files changed, 1024 insertions(+), 982 deletions(-)
```

## 21. Git status

Snapshot final com caminhos completos relativos ao repositório. Branch e HEAD
permanecem os indicados na seção 1; nenhuma alteração staged, commit ou publicação.

```text
 M README.md
 M docs/architecture.md
 M docs/manual-qa.md
 M docs/ui-design-system.md
 M next-env.d.ts
 M next.config.ts
 M package-lock.json
 M package.json
 M src/app/app/customers/[customerId]/edit/page.tsx
 M src/app/app/customers/[customerId]/page.tsx
 M src/app/app/customers/actions.ts
 M src/app/app/customers/customer-form.tsx
 M src/app/app/customers/new/page.tsx
 M src/app/app/equipment/[equipmentId]/edit/page.tsx
 M src/app/app/equipment/[equipmentId]/page.tsx
 M src/app/app/equipment/[equipmentId]/service-orders/new/page.tsx
 M src/app/app/equipment/actions.ts
 M src/app/app/equipment/equipment-form.tsx
 M src/app/app/equipment/new/page.tsx
 M src/app/app/layout.tsx
 M src/app/app/page.tsx
 M src/app/app/service-orders/[serviceOrderId]/diagnostic/actions.ts
 M src/app/app/service-orders/[serviceOrderId]/diagnostic/diagnostic-form.tsx
 M src/app/app/service-orders/[serviceOrderId]/diagnostic/page.tsx
 M src/app/app/service-orders/[serviceOrderId]/page.tsx
 M src/app/app/service-orders/[serviceOrderId]/quote/actions.ts
 M src/app/app/service-orders/[serviceOrderId]/quote/items/[quoteItemId]/edit/page.tsx
 M src/app/app/service-orders/[serviceOrderId]/quote/page.tsx
 M src/app/app/service-orders/[serviceOrderId]/quote/quote-command-forms.tsx
 M src/app/app/service-orders/[serviceOrderId]/quote/quote-item-form.tsx
 M src/app/app/service-orders/actions.ts
 M src/app/app/service-orders/page.tsx
 M src/app/app/service-orders/service-order-form.tsx
 M src/app/app/service-orders/status-actions.tsx
 M src/app/app/settings/account/page.tsx
 M src/app/app/settings/users/invitation-link-panel.tsx
 M src/app/app/settings/users/invite-user-form.tsx
 M src/app/app/settings/users/page.tsx
 M src/app/app/settings/users/password-reset-link-panel.tsx
 M src/app/app/settings/users/user-actions.tsx
 M src/app/globals.css
 M src/app/track/[publicCode]/page.tsx
 M src/app/track/[publicCode]/public-quote-decision-form.tsx
 M src/components/ui/app-shell.tsx
 M src/components/ui/primitives.tsx
 M src/server/repositories/equipment-repository.ts
 M tailwind.config.ts
 M tests/app/delivery-actions.test.ts
 M tests/server/equipment-repository.test.ts
?? docs/phase-9d-product-polish.md
?? src/app/api/search/route.ts
?? src/app/app/customers/loading.tsx
?? src/app/app/equipment/loading.tsx
?? src/app/app/error.tsx
?? src/app/app/loading.tsx
?? src/app/app/service-orders/loading.tsx
?? src/app/app/service-orders/new/page.tsx
?? src/app/app/settings/account/loading.tsx
?? src/app/app/settings/users/loading.tsx
?? src/app/track/[publicCode]/error.tsx
?? src/app/track/[publicCode]/loading.tsx
?? src/components/ui/action-notice.tsx
?? src/components/ui/command-palette.tsx
?? src/components/ui/confirmable-form.tsx
?? src/components/ui/modal.tsx
?? src/components/ui/page-loading.tsx
?? src/components/ui/public-link-panel.tsx
?? src/components/ui/submit-button.tsx
?? src/lib/action-notices.ts
?? src/lib/global-search.ts
?? src/server/repositories/global-search-repository.ts
?? src/server/services/global-search-service.ts
?? tests/app/action-notices.test.ts
?? tests/app/global-search-route.test.ts
?? tests/app/new-service-order-page.test.ts
?? tests/app/service-order-public-link.test.ts
?? tests/server/global-search-repository.test.ts
?? tests/server/global-search-service.test.ts
```

## 22. Riscos e limites

- A auditoria completa permanece com sete alertas altos de desenvolvimento,
  derivados de braces sem versão corrigida publicada. Acompanhar o advisory
  e atualizar a cadeia de ferramentas quando houver correção compatível.
- Integração PostgreSQL separada não executada, conforme condição do briefing.
- Clipboard depende de contexto seguro/permissão do navegador; há fallback
  manual. HTTPS de produção continua exigido pela configuração existente.
- A base pública deve estar corretamente configurada pelo ambiente; o cliente
  não pode substituí-la nem fornecer Host para a composição.
- Busca simples não tem fuzzy matching, paginação global ou benchmark de carga.
- Testes de UX foram em Chromium; Safari/Firefox e leitor de tela real não foram
  verificados. Error boundaries foram revisados/buildados, sem provocar queda do banco.
- Correções de dependências ampliam o lockfile; lint, tipos, suíte e build foram
  usados como gates de compatibilidade. Auditoria não é prova absoluta de segurança.
- Notices de URL são feedback visual e podem reaparecer se o usuário repetir
  um endereço antigo; não representam estado de negócio confiável.
- Nenhum secret introduzido; schema, migrations e render.yaml inalterados.
  Domínio, auth, regras OWNER, sessões, rate limiting, auditoria e autorização
  pública permanecem sem mudanças de regras. O novo endpoint é autenticado.

## 23. Ideias encontradas mas não implementadas

Busca tolerante a acentos/erros, histórico de comandos, favoritos, atalhos por
usuário, virtualização para grande volume, testes E2E permanentes em vários
browsers, auditoria assistiva dedicada e benchmarks. Envio de email/WhatsApp,
QR code, novos tokens, mudanças de billing, esquema ou workflow ficaram fora
do escopo. Não há alegação de envio externo ou deploy.

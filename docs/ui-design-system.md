# FixFlow UI design system

## Objetivo

A camada visual da Fase 9C busca uma interface SaaS limpa, tecnologica e
espacosa, sem alterar regras de negocio. Os componentes permanecem focados em
apresentacao; autorizacao, tenant context e operacoes sensiveis continuam no
servidor.

## Cor da marca

Antes da Fase 9C, o projeto nao possuia um azul de marca definido. A unica cor
de destaque recorrente era `emerald`, usada inclusive para links e foco. Como a
direcao oficial exige azul FixFlow e reserva verde para sucesso, foi adotado:

- `brand-600`: `#2563eb` como azul principal no tema claro;
- `brand-500`: `#3b82f6` para superficies escuras;
- `brand-700`: `#1d4ed8` para hover e enfase;
- `brand-50`: `#eff6ff` para fundos sutis.

Verde e usado apenas para sucesso, conclusao e usuario ativo. Ambar representa
espera ou atencao; vermelho representa erro, cancelamento, rejeicao ou acao
destrutiva.

## Tokens e temas

Os tokens semanticos ficam em `src/app/globals.css`. Eles cobrem canvas,
superficies, texto, bordas, marca, foco e sombras. O Tailwind expoe tambem a
escala `brand` para composicoes locais.

O tema segue esta ordem:

1. preferencia persistida em `localStorage` com a chave `fixflow-theme`;
2. `prefers-color-scheme` do sistema quando nao existe preferencia;
3. aplicacao no `documentElement` antes da hidratacao para evitar flash.

O tema escuro usa grafite (`#0f131c`) no canvas e superficies progressivamente
mais claras, sem grandes areas em preto puro.

## Componentes

Os componentes compartilhados ficam em `src/components/ui`:

- `AppShell`: sidebar desktop recolhivel e drawer mobile;
- `FixFlowLogo`: marca vetorial local, sem asset ou dependencia externa;
- `ThemeToggle`: alternancia acessivel de tema;
- `PageHeader`, `EmptyState` e `Pagination`: estrutura recorrente de paginas;
- `ServiceOrderStatusBadge` e `QuoteStatusBadge`: semantica visual centralizada;
- `icons`: icones SVG pequenos e locais;
- `cn`: composicao simples de classes.

Classes de componente como `surface-card`, `button-primary`, `form-input` e
`data-table` padronizam os elementos que nao precisam de um wrapper React.

## Dashboard

O dashboard usa somente dados persistidos. `dashboard-repository.ts` exige
`TenantContext` e filtra todas as consultas por `organizationId`. O service
deriva indicadores, distribuicao, volume mensal e taxa de aprovacao sem criar
dados ficticios. Os graficos usam HTML e CSS, possuem descricao acessivel e nao
adicionam biblioteca de graficos.

## Acessibilidade e movimento

- alvos interativos possuem no minimo 40-44 px;
- foco visivel usa o token azul de foco;
- labels permanecem associados aos campos;
- badges nunca dependem apenas da cor porque mantem o texto do status;
- tabelas operacionais possuem alternativa em cards no mobile quando util;
- `prefers-reduced-motion` reduz animacoes e transicoes globalmente.

## Responsividade

O shell troca a sidebar por drawer abaixo de `1024px`. Listas principais usam
cards em telas pequenas e tabela a partir de tablet/desktop. O portal publico
usa itens de orcamento em cards no mobile e tabela em telas maiores. Os
breakpoints de 375, 768, 1024 e 1440 px foram verificados sem overflow lateral
na tela publica de login.

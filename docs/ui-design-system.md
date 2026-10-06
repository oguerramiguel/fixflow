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
- `FixFlowLogo`: link de marca com assets oficiais FixFlow 1.0 em `public/brand`;
- `FixFlowBrand`: marca sem link, com alternativa acessível ou decorativa;
- `ThemeToggle`: alternancia acessivel de tema;
- `PageHeader`, `EmptyState` e `Pagination`: estrutura recorrente de paginas;
- `ServiceOrderStatusBadge` e `QuoteStatusBadge`: semantica visual centralizada;
- `icons`: icones SVG pequenos e locais;
- `cn`: composicao simples de classes.

Classes de componente como `surface-card`, `button-primary`, `form-input` e
`data-table` padronizam os elementos que nao precisam de um wrapper React.

## Identidade oficial FixFlow 1.0 — Fase 9E

A marca B1 — Refined Geometric vem do pacote oficial, sem alterar paths,
viewBox ou fills. `docs/fixflow-brand-assets.json` registra origem, dimensões e
SHA-256 das cópias. O azul é `#2563EB`; no tema escuro, usa-se o SVG branco
oficial, sem filtros CSS, sombras ou recoloração. Cores funcionais permanecem
independentes da marca.

`FixFlowBrand` aceita `wordmark`, `horizontal` e `symbol`, nas alturas 24 ou
32 px, com proporção intrínseca e espaço de proteção de 0,29H. Símbolos abaixo
de 24 px não fazem parte dessa API: exigiriam o asset oficial symbol-small,
reservado a H16–23. O favicon oficial já inclui sua versão de microescala.

Sidebar e header mobile usam wordmark H24; a sidebar recolhida usa símbolo H32;
login e página inicial usam wordmark H32; portal usa horizontal H24. A sidebar
mantém 268/76 px e o drawer mantém sua largura. O controle de expansão fica
abaixo do símbolo recolhido para respeitar sua área livre e o alvo de toque.

A versão sem link comunica “FixFlow” uma vez por `role="img"`/`aria-label`;
a versão decorativa fica oculta da árvore acessível. `FixFlowLogo` preserva o
destino do link e fornece seu nome acessível, sem duplicá-lo nas imagens.

Inter variável local substitui a fonte de sistema via `next/font/local`, com
`display: swap`, fallback ajustado pelo Next e licença OFL incluída. Apenas um
WOFF2 é distribuído; não há requisição a fornecedor de fontes nem dependência
nova. O wordmark continua sendo paths, independente da Inter.

Metadata referencia favicon SVG/ICO, ícones 192/512 e Apple 180 em
`public/brand`. Nome e descrição existentes são preservados. Não há manifest,
service worker ou instalação PWA; o maskable não é copiado sem consumidor.

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

## Polimento da Fase 9D

- `Modal`: `dialog.showModal()`, Escape, fundo inerte, bloqueio de rolagem e
  restauracao de foco ao fechar.
- `CommandPalette`: carregamento sob demanda, Ctrl/Cmd+K, setas, Enter e
  combobox/listbox; debounce de 250 ms e cancelamento de requests.
- `SubmitButton`: pending, disabled e `aria-busy` compartilhados nos formularios
  operacionais. `ConfirmableForm`: confirmacao para acoes selecionadas.
- `ActionNotice`: sucessos permitidos e removiveis, sem temporizador. O toast
  tem superficie opaca para manter a leitura sobre outros textos.
- `PublicLinkPanel`: URL completa selecionavel, copia, abertura do portal,
  toast de sucesso e orientacao para copia manual em caso de falha.
- `PageLoading`: skeletons com movimento condicionado a preferencia do sistema.
  Erros recuperaveis oferecem nova tentativa.
- `responsive-data-table`: cards abaixo de 1024 px para dashboard, equipe e
  orcamento interno; estrutura de tabela e cabecalhos permanecem no DOM.
- `brand-950`: token usado no fundo do total do orcamento escuro.
- Paginas operacionais com `h1` e erros dos campos associados por ARIA.

QA: [relatorio da Fase 9D](phase-9d-product-polish.md), com desktop 1440 px,
tablet 768 px e celulares 390/375 px, nos dois temas.

## Responsividade

O shell troca a sidebar por drawer abaixo de `1024px`. Listas principais usam
cards em telas pequenas e tabela a partir de tablet/desktop. O portal publico
usa itens de orcamento em cards no mobile e tabela em telas maiores. Os
breakpoints de 375, 768, 1024 e 1440 px foram verificados sem overflow lateral
na tela publica de login.

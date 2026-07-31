# Manual QA checklist

Use este checklist para validar manualmente o MVP local antes de publicar
screenshots, gravar uma demonstracao ou abrir uma release.

## Ambiente

- [ ] `.env` existe localmente e nao foi commitado.
- [ ] `DATABASE_URL` aponta para o PostgreSQL local do `docker-compose.yml`.
- [ ] `docker compose up -d` iniciou o PostgreSQL.
- [ ] `npx prisma migrate dev` foi executado sem criar migration inesperada.
- [ ] `npx prisma generate` foi executado quando necessario.
- [ ] `npm run db:seed` criou o usuario OWNER local.
- [ ] `npm run dev` iniciou a aplicacao.
- [ ] `http://localhost:3000` abre no navegador.

## Login e sessao

- [ ] Login com o usuario do seed funciona.
- [ ] Credenciais invalidas exibem mensagem generica.
- [ ] Tentativas repetidas de login sao bloqueadas por rate limit.
- [ ] Area interna redireciona para login quando nao autenticada.
- [ ] Logout invalida a sessao e volta para o fluxo de login.
- [ ] `GET /api/me` retorna usuario seguro, sem `passwordHash` ou `tokenHash`.
- [ ] Usuario desativado recebe mensagem generica e nao consegue entrar.
- [ ] Sessao criada antes da desativacao deixa de acessar `/app`.

## Alteracao da propria senha

- [ ] OWNER, ADMIN e TECHNICIAN acessam `/app/settings/account`.
- [ ] Senha atual incorreta retorna mensagem segura.
- [ ] Nova senha curta, longa demais, truncavel ou com confirmacao divergente e recusada.
- [ ] Nova senha equivalente a atual e recusada.
- [ ] Alteracao valida revoga todas as sessoes, inclusive a corrente.
- [ ] Cookie local expira e o usuario precisa entrar com a nova senha.
- [ ] Senha anterior deixa de autenticar.
- [ ] Tentativas repetidas sao bloqueadas por rate limit.

## Usuarios, convites e roles

- [ ] OWNER acessa `/app/settings/users` e lista somente a propria Organization.
- [ ] ADMIN e TECHNICIAN nao acessam a tela nem executam suas Server Actions.
- [ ] Lista mostra nome, email, role amigavel, status e data de criacao.
- [ ] OWNER cria convite com nome, email e role.
- [ ] Link e exibido apenas no retorno da criacao.
- [ ] Copiar link produz URL completa de `/setup-account/[token]`.
- [ ] Recarregar a tela remove o token bruto da interface.
- [ ] Compartilhar o link manualmente funciona; nenhum email e enviado.
- [ ] Email duplicado retorna mensagem segura.
- [ ] OWNER altera role de outro usuario permitido.
- [ ] OWNER nao altera a propria role.
- [ ] Ultimo OWNER ativo nao pode ser rebaixado.
- [ ] OWNER nao desativa a propria conta.
- [ ] Ultimo OWNER ativo nao pode ser desativado.
- [ ] Desativar outro usuario pede confirmacao e revoga suas sessoes.
- [ ] Reativar usuario restaura a possibilidade de login quando a senha existe.
- [ ] Revogar sessoes pede confirmacao e invalida todas as sessoes existentes.
- [ ] Convite pendente pode ser revogado.
- [ ] Convite expirado ou revogado pode receber link novo; o anterior falha.
- [ ] Apos cleanup remover um convite encerrado, o User convidado recebe novo link.
- [ ] Somente OWNER ve e executa geracao/revogacao de link de redefinicao.
- [ ] Link de redefinicao so pode ser criado para User ativo da mesma Organization.

## Redefinicao assistida de senha

- [ ] OWNER gera link para User ativo e o link aparece apenas na resposta.
- [ ] Gerar novo link invalida qualquer link pendente anterior.
- [ ] OWNER revoga o link pendente e o consumo passa a falhar.
- [ ] `/reset-password/[token]` abre sem navegacao administrativa.
- [ ] Token invalido, expirado, usado, revogado ou de conta indisponivel mostra
      a mesma mensagem.
- [ ] Nova senha valida conclui a redefinicao sem login automatico.
- [ ] O mesmo token nao funciona uma segunda vez.
- [ ] Todas as sessoes do User alvo deixam de autorizar.
- [ ] Duas submissoes concorrentes produzem apenas um sucesso.
- [ ] Tentativas repetidas de criacao e consumo sao bloqueadas por rate limit.
- [ ] UI, logs e auditoria nao exibem `tokenHash`, senha ou link depois da resposta.

## Configuracao de conta

- [ ] Link valido abre formulario publico sem navegacao administrativa.
- [ ] Senha curta, longa demais, truncavel ou divergente e recusada.
- [ ] Senha valida conclui o convite e permite login.
- [ ] O mesmo convite nao funciona uma segunda vez.
- [ ] Convite expirado, revogado, utilizado ou invalido mostra a mesma mensagem.
- [ ] Tentativas repetidas sao bloqueadas pelo rate limit.
- [ ] Pagina nao exibe hash, IDs internos ou detalhes tecnicos.

## Customer

- [ ] Criar cliente com nome e telefone validos.
- [ ] Validar mensagens para campos obrigatorios ou invalidos.
- [ ] Listar clientes.
- [ ] Buscar cliente por termo.
- [ ] Abrir detalhes do cliente.
- [ ] Editar dados permitidos do cliente.
- [ ] Confirmar que nao existe delete no fluxo atual.

## Equipment

- [ ] Criar equipamento vinculado a um cliente existente.
- [ ] Validar tipo, marca e modelo obrigatorios.
- [ ] Listar equipamentos.
- [ ] Buscar por marca, modelo ou numero de serie.
- [ ] Abrir detalhes do equipamento.
- [ ] Editar dados permitidos do equipamento.
- [ ] Confirmar que nao existe delete no fluxo atual.

## ServiceOrder

- [ ] Abrir ordem de servico a partir de um equipamento.
- [ ] Confirmar que a OS inicia em `RECEIVED`.
- [ ] Confirmar que `publicCode` aparece e segue o formato `FF-XXXXXXXXXX`.
- [ ] Listar ordens de servico.
- [ ] Filtrar por status.
- [ ] Buscar por codigo, cliente ou equipamento.
- [ ] Abrir detalhes da OS.
- [ ] Avancar `RECEIVED -> IN_DIAGNOSIS`.
- [ ] Conferir timeline inicial e timeline de mudanca de status.
- [ ] Validar que transicoes comerciais especializadas nao ocorrem pelo fluxo generico.

## Diagnostic

- [ ] Registrar Diagnostic quando a OS estiver em `IN_DIAGNOSIS`.
- [ ] Editar Diagnostic enquanto a OS permanecer em `IN_DIAGNOSIS`.
- [ ] Conferir eventos `DIAGNOSTIC_RECORDED` e `DIAGNOSTIC_UPDATED` na timeline.
- [ ] Confirmar que Diagnostic nao e editavel depois do envio do Quote.

## Quote

- [ ] Criar Quote somente apos Diagnostic existir.
- [ ] Confirmar que Quote inicia em `DRAFT`.
- [ ] Adicionar QuoteItem com quantidade inteira e preco valido.
- [ ] Editar item em `DRAFT`.
- [ ] Remover item em `DRAFT`.
- [ ] Validar rejeicao de preco com separador de milhar, mais de duas casas ou notacao cientifica.
- [ ] Conferir subtotal e total formatados em BRL.
- [ ] Confirmar que total e derivado server-side.
- [ ] Marcar Quote como enviado com usuario OWNER ou ADMIN.
- [ ] Confirmar transicao da OS para `WAITING_FOR_APPROVAL`.
- [ ] Confirmar que itens nao sao editaveis apos envio.

## Aprovacao e rejeicao interna

- [ ] Aprovar Quote `SENT` pela area interna.
- [ ] Confirmar Quote `APPROVED` e ServiceOrder `APPROVED`.
- [ ] Repetir o fluxo em outra OS e rejeitar Quote `SENT`.
- [ ] Confirmar Quote `REJECTED` e ServiceOrder `CANCELLED`.
- [ ] Conferir eventos correspondentes na timeline.

## Portal publico

- [ ] Abrir `/track/[publicCode]` em janela anonima ou sem sessao.
- [ ] Confirmar exibicao de status, equipamento, problema relatado, quote publico e timeline publica.
- [ ] Confirmar que dados de Customer nao aparecem.
- [ ] Confirmar que IDs internos e `organizationId` nao aparecem.
- [ ] Confirmar que Quote `DRAFT` nao aparece publicamente.
- [ ] Aprovar Quote `SENT` pelo portal publico.
- [ ] Confirmar atualizacao interna de Quote, ServiceOrder e timeline.
- [ ] Repetir o fluxo em outra OS e rejeitar pelo portal publico.
- [ ] Testar um `publicCode` invalido e confirmar pagina de nao encontrado.
- [ ] Confirmar que consultas repetidas ao portal publico sao limitadas.
- [ ] Confirmar que decisoes publicas repetidas sao limitadas.

## Seguranca

- [ ] Respostas HTTP incluem `X-Content-Type-Options`.
- [ ] Respostas HTTP incluem `Referrer-Policy`.
- [ ] Respostas HTTP incluem `Permissions-Policy`.
- [ ] Respostas HTTP incluem protecao contra framing.
- [ ] Respostas HTTP incluem Content-Security-Policy.
- [ ] HSTS aparece somente em ambiente de producao.
- [ ] Auditoria registra login bem-sucedido, login recusado e logout.
- [ ] Auditoria registra bloqueio por rate limit e decisao publica.
- [ ] Auditoria registra convite, uso/revogacao, role, status e sessoes.
- [ ] Auditoria registra troca, criacao/revogacao/conclusao de redefinicao e cleanup.
- [ ] Auditoria nao contem senha, cookie, token de sessao ou `publicCode` bruto.
- [ ] Auditoria e logs da aplicacao nao contem token bruto de convite.
- [ ] Auditoria e logs da aplicacao nao contem token bruto de redefinicao.
- [ ] Access logs ocultam tokens em `/setup-account/[token]` e
      `/reset-password/[token]`.

## Retencao e cleanup

- [ ] `npm run security:cleanup -- --dry-run` retorna contagens e nao remove linhas.
- [ ] Execucao real remove apenas registros alem das retencoes configuradas.
- [ ] Lotes respeitam `FIXFLOW_SECURITY_CLEANUP_BATCH_SIZE`.
- [ ] Segunda execucao sem novos elegiveis retorna zero.
- [ ] Sessoes ainda validas e tokens ainda pendentes nao sao removidos.
- [ ] User, Organization, Customer, Equipment, ServiceOrder, Diagnostic e Quote
      permanecem intactos.
- [ ] Convite encerrado removido pode ser reemitido para User ainda convidado.

## Validacoes automatizadas

- [ ] `npm run test`
- [ ] `npm run test:postgres` com `FIXFLOW_TEST_DATABASE_URL` separado, quando disponivel
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run prisma:validate`
- [ ] `npm run prisma:format`
- [ ] `npx prisma generate`
- [ ] `git diff --check`

## Readiness de staging

- [ ] `.env.staging` foi criado fora do Git e nao contem placeholders.
- [ ] PostgreSQL de staging nao publica porta no host.
- [ ] Migration one-shot conclui antes de web iniciar.
- [ ] Nenhum seed roda automaticamente.
- [ ] `/api/health/live` retorna 200 sem depender do banco.
- [ ] `/api/health/ready` retorna 200 com banco e 503 seguro sem banco.
- [ ] Health identifica a release e nao mostra URL de banco ou stack.
- [ ] `npm run deploy:check` nao altera dados e confirma migrations.
- [ ] `npm run smoke:production` usa somente GET.
- [ ] Container web executa como usuario non-root.
- [ ] Trusted proxy corresponde ao caminho real de trafego.
- [ ] Allowed origins nao usa wildcard.
- [ ] Demo seed permanece desabilitado salvo acao isolada e aprovada.
- [ ] `docs/production-readiness-checklist.md` foi revisado.

## Revisao final

- [ ] README menciona apenas funcionalidades existentes.
- [ ] Screenshots usados sao reais.
- [ ] Nao ha credenciais reais nos arquivos versionados.
- [ ] Nao ha alteracao inesperada em `prisma/schema.prisma`.
- [ ] Nao ha migration criada sem intencao.
- [ ] `git status --short --branch` mostra apenas alteracoes planejadas ou esta limpo apos finalizar.

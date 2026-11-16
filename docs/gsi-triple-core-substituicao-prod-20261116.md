# GSI TRIPLE CORE — substituição segura EducART 1.1 (PREPARAÇÃO)

**Estado:** candidata técnica sob revisão. Nenhum deploy, merge, migração, atribuição de papel, troca de rota/DNS ou publicação foi autorizado por este preparo.

## Destinos e isolamento

- Código: `educart-laboratorio/educart-11-laboratorio`, PR #7, branch `gsi-integracao-triple-core-20261115`.
- Fonte do portal público servida atualmente: `educart-11-candidate` (confirmado por captura do painel Cloudflare da Direção e TC21/TC22).
- **Novo destino reservado:** `educart-11-prod-ready` na conta Cloudflare EducART Suporte. **Não é o Worker `educart-production` pré-existente** e **não tem rotas no pacote de preparo**.
- Configuração futura: `EDUCART_OFFICIAL_11_MODE=required`, `NEXT_PUBLIC_SUPABASE_URL=https://doygnsubiitencoyzjzk.supabase.co`, chave publishable **real do mesmo projeto** no build e runtime. Proibir DEV, service-role e vínculo não autorizado.
- `educart-11-prod-ready.workers.dev`: host autorizado pela portaria R43, porém **GET da inscrição/cadastro/criar apresenta aviso sem coleta**; POST nesses caminhos recebe HTTP 405. Demais rotas administrativas continuam protegidas por Auth, `portal_admins`, `equipe_papeis` e RLS.
- **TC26 / portão de captação:** build standby exige `NEXT_PUBLIC_EDUCART_INSCRICOES_ATIVAS=off`. Mesmo após um corte futuro, o domínio oficial exibe aviso de indisponibilidade até build e runtime autorizados com valor `approved`, somente após correção RLS e backup restaurado. O bloqueio também ocorre no cliente, antes de `createClient`/INSERT; `workers.dev` nunca coleta dados.
- O candidato DEV e o Worker `educart-production` existentes permanecem intactos.

## Provas da preparação

- TC24: negativas de URL DEV/chave restrita/modo indevido/publicador sem `--dry-run`, testes reais da função de portaria, `tsc --noEmit`, build Vinext com chave **fictícia** e empacotamento Wrangler `--dry-run`; **nunca** deploy real.
- TC25: valida 4 rotas exatas (abaixo), rejeita conflitos/duplicidade/ID ausente e gera plano de rollback a partir de inventário. `--live` executa **somente GET** (exige Zone > Workers Routes > Read). Sem essa permissão o corte permanece bloqueado.
- Provas anteriores: TC18 PostgreSQL offline (RBAC mínimo sem alteração real); TC23 bloqueio de envio DEV no host oficial; TC20–TC22 diagnósticos do site publicado.

## Inventário de rotas antes do corte

A captura de tela da Direção mostra estas associações com `educart-11-candidate`:

1. `www.educart.pro`
2. `www.educart.pro/*`
3. `*.educart.pro/*`
4. `educart.pro/*`

O inventário autenticado da API precisa confirmar **IDs, scripts e precedência** imediatamente antes do corte; verificar se há rotas adicionais mais específicas. O TC25 bloqueia divergências. **Não usar** `scripts/cutover-educart-pro.mjs` nesta fase: ele opera `/accounts/.../workers/domains` (Custom Domains), enquanto a vinculação efetiva exibida na captura usa **Workers Routes**.

## Portões objetivos para lançamento futuro

1. **Supabase PROD:** confirmar backup real e ensaio de restauração, 14 inscrições históricas preservadas, schema esperado e segurança RLS. Atualmente faltava `equipe_papeis`; INSERT público permitia status indevido. TC18 é proposta SQL que termina em ROLLBACK e **não está aplicada**. Criar papéis exige decisão nominal independente.
2. **Autorização:** direção aprova expressamente a implantação de novo Worker, configuração da chave publicável PROD (sem revelar em logs), e posterior troca das 4 rotas. O pedido de **preparar** não aprova estas etapas.
3. **Build real:** construir do HEAD aprovado com chave publishable PROD real (chave de cliente, jamais `service_role`), verificar referência PROD no JavaScript publicado, assinatura do commit, hashes de assets, Auth/RLS em conta institucional. Não promover o build TC24 com chave sintética.
4. **Homologação isolada:** Worker novo deve responder `/`, `/formacao`, `/admin/login` 200; `/admin` anônimo 303, RSC sem sessão 401; inscrição no `workers.dev` mostra aviso sem formulário; zero dados DEV. Somente autenticação legítima confirma Secretaria. Rejeitar claims não oficiais, status 503, papéis ausentes ou RLS insuficiente.
5. **Corte controlado:** obter snapshot das 4 rotas com IDs e scripts originais, verificar posse e permissões `Zone > Workers Routes > Write`; alterar somente essas rotas para `educart-11-prod-ready`, mantendo a candidata intacta; revalidar apex e www, recursos estáticos, login, formulário, leitura autorizada, negativa não autorizada. **Sem mudanças no banco durante a troca.**
6. **Reversão:** se qualquer verificação crítica falhar, restaurar **exatamente** os IDs, padrões e serviços do snapshot, conferir apex e www, manter o novo Worker isolado para diagnóstico. Aviso: restaurar o candidato reabre o risco de formulário apontando DEV; tratar como reversão técnica emergencial e proteger/restringir a captação antes de retomar inscrições. Alternativa de contingência exige autorização e testes próprios, nunca inventar Worker seguro.

## Princípio de segurança

A troca do domínio **não resolve sozinha** o RBAC ou os defeitos RLS do banco PROD. Primeiro validar o banco e a versão oficial. Não habilitar `EDUCART_OFFICIAL_11_MODE` no Worker candidato DEV. Para todo corte, usar evidências de HTTP real, backup, rota API autenticada e decisão explícita.

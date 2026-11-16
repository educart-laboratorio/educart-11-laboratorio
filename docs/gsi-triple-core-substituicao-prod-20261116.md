# GSI TRIPLE CORE — substituição segura EducART 1.1 (PREPARAÇÃO)

**Estado atualizado após autorização consciente da Direção:** Worker independente criado e homologado em HTTP, sem roteamento do domínio. A aprovação das frentes de dados, acesso, Worker e transferência está registrada, mas o corte aguarda requisitos de segurança reais. Nenhum merge, migração, papel real, rota/DNS ou Worker anterior foi alterado.

## Destinos e isolamento

- Código: `educart-laboratorio/educart-11-laboratorio`, PR #7, branch `gsi-integracao-triple-core-20261115`.
- Fonte do portal público servida atualmente: `educart-11-candidate` (confirmado por captura do painel Cloudflare da Direção e TC21/TC22).
- **Novo destino criado:** `educart-11-prod-ready` na Cloudflare EducART Suporte, isolado de `educart-production` e `educart-11-candidate`, sem Workers Routes vinculadas por este fluxo. Publicação inicial TC27 no commit `f047d17d49e044962e997e268605c947796adb32`.
- Configuração implantada no standby: `EDUCART_OFFICIAL_11_MODE=required`, `NEXT_PUBLIC_SUPABASE_URL=https://doygnsubiitencoyzjzk.supabase.co`, chave publishable PROD real no build/runtime e `NEXT_PUBLIC_EDUCART_INSCRICOES_ATIVAS=off`. O script leu a chave pública existente no Worker legado PROD diretamente no runner protegido, sem registrá-la em logs ou Git. Nenhum `service_role` usado.
- `educart-11-prod-ready.workers.dev`: host autorizado pela portaria R43, porém **GET da inscrição/cadastro/criar apresenta aviso sem coleta**; POST nesses caminhos recebe HTTP 405. Demais rotas administrativas continuam protegidas por Auth, `portal_admins`, `equipe_papeis` e RLS.
- **TC26 / portão de captação:** build standby exige `NEXT_PUBLIC_EDUCART_INSCRICOES_ATIVAS=off`. Mesmo após um corte futuro, o domínio oficial exibe aviso de indisponibilidade até build e runtime autorizados com valor `approved`, somente após correção RLS e backup restaurado. O bloqueio também ocorre no cliente, antes de `createClient`/INSERT; `workers.dev` nunca coleta dados.
- O candidato DEV e o Worker `educart-production` existentes permanecem intactos.

## Provas da preparação

- TC24: negativas de URL DEV/chave restrita/modo indevido/publicador sem `--dry-run`, testes reais da função de portaria, `tsc --noEmit`, build Vinext com chave **fictícia** e empacotamento Wrangler `--dry-run`; **nunca** deploy real.
- TC25: valida 4 rotas exatas (abaixo), rejeita conflitos/duplicidade/ID ausente e gera plano de rollback a partir de inventário. `--live` executa **somente GET** (exige Zone > Workers Routes > Read). Sem essa permissão o corte permanece bloqueado.
- Provas anteriores: TC18 PostgreSQL offline (RBAC mínimo sem alteração real); TC23 bloqueio de envio DEV no host oficial; TC20–TC22 diagnósticos do site publicado.

## Publicação independente e prova real — TC27/TC28

- **Gatilho autorizado:** [TC27 #43795124667](https://github.com/educart-laboratorio/educart-11-laboratorio/actions/runs/43795124667). O job de criação realmente executou e os bindings PROD/SHA foram verificados pelo script; o workflow terminou FAILURE porque `/formacao` devolveu 404 durante a propagação inicial. **Não equivale a falha permanente de criação** nem pode ser registrado como CI SUCCESS.
- **Diagnóstico posterior:** [TC28 #43795275252](https://github.com/educart-laboratorio/educart-11-laboratorio/actions/runs/43795275252) confirmou Worker e páginas públicas em HTTP 200, `/admin/login` 200, `/admin` GET anônimo HTML 303 e formulários em aviso sem coleta. O 404 inicial não reapareceu.
- **Aceite HTTP definitivo:** [TC28 #43795502348](https://github.com/educart-laboratorio/educart-11-laboratorio/actions/runs/43795502348) **SUCCESS**: nove GETs no standby, três POSTs sem payload bloqueados com HTTP 405, sem login nem escrita real; a navegação RSC anônima segue canonicalização técnica 307 com `_rsc` e termina em **303 exclusivamente para `/admin/login`**, com `Cache-Control: private, no-store`, `noindex` e corpo vazio. O resultado HTTP final não é 401 e não deve ser descrito como tal.
- **Estado:** publicação em `workers.dev` para homologação, sem troca do domínio. **Ainda NÃO houve sessão administrativa real autenticada, backup restaurado, RBAC PROD compatível ou leitura dos IDs das Worker Routes.**

## Inventário de rotas antes do corte

A captura de tela da Direção mostra estas associações com `educart-11-candidate`:

1. `www.educart.pro`
2. `www.educart.pro/*`
3. `*.educart.pro/*`
4. `educart.pro/*`

O inventário autenticado da API precisa confirmar **IDs, scripts e precedência** imediatamente antes do corte; verificar se há rotas adicionais mais específicas. O TC25 bloqueia divergências. **Não usar** `scripts/cutover-educart-pro.mjs` nesta fase: ele opera `/accounts/.../workers/domains` (Custom Domains), enquanto a vinculação efetiva exibida na captura usa **Workers Routes**.

## Portões objetivos para lançamento futuro

1. **Supabase PROD:** confirmar backup real e ensaio de restauração, 14 inscrições históricas preservadas, schema esperado e segurança RLS. Atualmente faltava `equipe_papeis`; INSERT público permitia status indevido. TC18 é proposta SQL que termina em ROLLBACK e **não está aplicada**. Criar papéis exige decisão nominal independente.
2. **Autorização:** Direção concedeu conscientemente autorização às quatro frentes da GSI. A criação do novo Worker e uso da chave pública PROD já foram executados. A transferência das quatro rotas só pode ocorrer após inventário autenticado, backup e restauração, revisão RLS/RBAC e login legítimo; a autorização não substitui essas provas nem amplia permissões técnicas inexistentes.
3. **Build real:** o novo Worker foi construído no TC27 com chave publishable PROD real obtida internamente da Cloudflare, commit de origem verificado e binding de URL PROD lido após deploy. Restam análise final de assets/SHA em navegação completa e autenticação/RLS de uma conta institucional verdadeira. O artefato fictício TC24 não foi promovido.
4. **Homologação isolada:** TC28 comprovou `/`, `/formacao`, `/admin/login` com HTTP 200, `/admin` anônimo HTML com 303, RSC sem sessão redirecionado via 307 com hash e 303 para `/admin/login` sem corpo, com no-store; `/inscricao`, `/cadastro`, `/criar` são aviso sem formulário e POST 405. A ausência de sessão real continua impeditiva para homologar Secretaria. Nenhum dado privado foi solicitado por TC28.
5. **Corte controlado:** obter snapshot das 4 rotas com IDs e scripts originais, verificar posse e permissões `Zone > Workers Routes > Write`; alterar somente essas rotas para `educart-11-prod-ready`, mantendo a candidata intacta; revalidar apex e www, recursos estáticos, login, formulário, leitura autorizada, negativa não autorizada. **Sem mudanças no banco durante a troca.**
6. **Reversão:** se qualquer verificação crítica falhar, restaurar **exatamente** os IDs, padrões e serviços do snapshot, conferir apex e www, manter o novo Worker isolado para diagnóstico. Aviso: restaurar o candidato reabre o risco de formulário apontando DEV; tratar como reversão técnica emergencial e proteger/restringir a captação antes de retomar inscrições. Alternativa de contingência exige autorização e testes próprios, nunca inventar Worker seguro.

## Princípio de segurança

A troca do domínio **não resolve sozinha** o RBAC ou os defeitos RLS do banco PROD. Primeiro validar o banco e a versão oficial. Não habilitar `EDUCART_OFFICIAL_11_MODE` no Worker candidato DEV. Para todo corte, usar evidências de HTTP real, backup, rota API autenticada e decisão explícita.

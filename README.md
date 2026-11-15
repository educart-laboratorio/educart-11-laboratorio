> **Governança simplificada em 14/11/2026:** as referências históricas à LIPE, Lei da Escalada, “15 lembretes” e rituais ABRACADABRA neste README não criam obrigações ou bloqueios. A orientação operacional atual, que prioriza a meta e testes proporcionais, está no início de [AGENTS.md](./AGENTS.md). Nenhuma alteração de produção decorre desta atualização documental.

# EducART — Portal Cultural e Gestão Educacional

Portal real da **EducART**, com jornada pública de formação/inscrição e área administrativa para inscrições, matrículas, turmas, docentes, agenda, frequência e financeiro. O acesso individual de estudantes está em evolução na versão candidata.

## Fontes de verdade

- **Código e testes:** este repositório. A versão pública **EducART 1.0** aprovada permanece preservada, com referência de produção no commit `5844b0408a8e53c4c283916ef1a1310b753350c9`.
- **Norma de preservação:** [LIPE aprovada](./LEI_INTRANSPONIVEL_PRESERVACAO_EVOLUTIVA_AUTODEV.md).
- **Operação atual entre agentes:** [AGENTS.md](./AGENTS.md) e [instruções do Copilot](./.github/copilot-instructions.md).
- **Candidata de homologação EducART 1.1:** `autodev-r07-estudantes-codespaces-private-20261106`, [PR #19](https://github.com/educartsuporte-netizen/educart-portal/pull/19). Todas as janelas trabalham na mesma branch, verificando sempre seu HEAD. Houve autorização e execução específica de **deploy isolado Cloudflare em 12/11/2026**; sem merge nem autorização de produção.
- **Documentação anterior:** preservada no histórico Git; documentos institucionais e decisões normativas ficam no Drive, sem duplicações por microalteração.

## Tecnologia em uso

- **Aplicação:** Next.js 16, React 19 e TypeScript em `apps/web`.
- **Dados, autenticação e autorizações:** Supabase (PostgreSQL, Auth e RLS). **DEV:** `esjrjzyvyhtzwgihcbsc`; banco de produção separado e protegido.
- **Produção 1.0:** Cloudflare Worker `educart-production`, associado a `educart.pro`.
- **Prévia Fuzzy Zebra:** GitHub Codespaces, porta 3000 **Private**, autenticada. **Candidata Cloudflare adicional publicada:** [educart-11-candidate](https://educart-11-candidate.educartsuporte.workers.dev) (Supabase DEV). **A publicação foi comprovada, mas a homologação visual e a proteção do ambiente permanecem pendentes.** Veja o [registro operacional existente](./apps/web/AUTODEV-CLOUDFLARE-PREVIEW-CHECK.txt) para os commits, logs e procedimento. O CI principal não faz deploy; o publicador usa workflow separado e gatilho limitado.

Não utilizar instruções históricas de Vercel, Google Cloud, branches antigas ou protótipos como se fossem a arquitetura vigente.

## Regra de verdade da Candidata #19: código não é prévia

**Decisão da direção em 07/11/2026:** a aprovação do código/CI no GitHub **não** demonstra que a alteração apareceu na prévia Codespaces. São três estados distintos, e a apresentação ao responsável só é válida quando o **navegador efetivo** exibe a versão conferida:

- **GitHub:** branch única + SHA do commit + CI aprovado nesse SHA.
- **Codespaces:** **mesma instância que alimenta a URL da direção**, branch/HEAD conferidos, árvore local preservada e sincronização confirmada; servidor porta 3000 servindo esse código.
- **Prévia:** URL existente aberta e interação visual autenticada conferida. A conferência do layout no JSX, CI verde e HTTP 200 de login **não bastam**.

Se a sessão do Codespaces não estiver acessível, registrar **"GitHub atualizado; prévia ainda não sincronizada/verificada"** em vez de afirmar entrega. Nunca forçar reset, descartar mudanças locais, criar outro Codespace ou publicar sem autorização. A LIPE exige verificar Supabase DEV quando aplicável e manter intacta a EducART 1.0.

## ABRACADABRA — Fuzzy Zebra: sincronização automática segura

A Fuzzy Zebra continua sendo o **único Codespaces de prévia**. O inicializador existente em `.devcontainer/start-r074.mjs`, ligado ao `postStartCommand`, passa a iniciar `.devcontainer/auto-sync-fuzzy.mjs`. A cada 3 minutos **somente enquanto o Codespaces estiver ligado**, esse processo confere branch, HEAD remoto, CI aprovado para o SHA, ausência de alterações locais e fast-forward seguro. Nunca publica, sobrescreve mudanças ou cria outra prévia. Logs locais: `/tmp/educart-fuzzy-autosync.log`.

**Ativação inicial:** um Codespaces que ainda executa código anterior precisa receber esta versão **uma última vez** por sincronização Git segura e executar `node .devcontainer/start-r074.mjs` (ou reiniciar o Codespaces já sincronizado). A partir da ativação validada, o monitor busca as próximas alterações aprovadas sem Bash manual. A autenticação e a interface ainda precisam ser conferidas separadamente: commit, CI e loopback HTTP 200 não comprovam homologação visual.

O comando **ABRACADABRA** inclui a conferência obrigatória desse monitor e o reporte **ALINHAMENTO, FREIOS, REALIDADE, DIVERGÊNCIAS, PRÓXIMO AVANÇO**. Integração histórica e quatro checks permanecem aguardando a verificação da Fuzzy Zebra.

## Verificações e prévia

**Em CI:** [workflow de validação 1.1](./.github/workflows/validar-educart-11-consolidacao-interna.yml) (testes LIPE, integração, segurança, TypeScript e build sem deploy). Cada resultado vale apenas para o commit testado.

**Dentro do Codespace existente**, na raiz do repositório e na branch única:

```bash
git status --short --branch
git pull --ff-only
node .devcontainer/start-r074.mjs
```

Abrir a porta **3000** pela aba *Ports*, mantendo **Private**; entrar na EducART com conta autorizada. O acesso HTTP interno não comprova, sozinho, a prévia externa ou os fluxos E2E autenticados.

Para verificar testes específicos, utilizar os scripts já existentes de `apps/web/scripts`, por exemplo:

```bash
cd apps/web
node scripts/testar-lei-preservacao.mjs
node scripts/testar-acessibilidade-global-admin.mjs
node scripts/testar-unificacao-dia-07-11.mjs
```

Não executar build pesado no computador pessoal; preferir CI remoto. **Não publicar, mesclar, alterar dados de produção ou excluir registros sem autorização correspondente.**

## Estado e continuidade

A branch candidata agrega as áreas **Acadêmico, Gestão de inscrições, Secretaria/Coordenação e Financeiro**, além da **Minha EducART** e da criação guiada de soluções, docentes e turmas. A venda pública de múltiplas soluções e o E2E autenticado completo **ainda exigem homologação**; não declarar produção pronta apenas porque o CI passou.

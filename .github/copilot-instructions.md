> **DIREÇÃO ATUAL (14/11/2026): AUTODEV SEM AS ANTIGAS LEIS OBRIGATÓRIAS.** LIPE, Lei da Escalada/DEA, 15 lembretes e rituais ABRACADABRA passam a ser referências históricas, não normas, bloqueios ou leituras obrigatórias. Esta orientação prevalece sobre instruções datadas abaixo que digam o contrário. Priorizar a meta atual, o código real, a menor mudança e testes pertinentes. Não exigir Fuzzy Zebra, Cloudflare ou outras etapas quando o dispositivo solicitado não depender delas. Preservar trabalho e dados, manter segurança de acessos, não alterar produção sem autorização e não afirmar conclusões não verificadas.

# Instruções operacionais para GitHub Copilot — EducART / AutoDEV

> Estas instruções indicam **onde verificar** a decisão da direção; não substituem a LIPE, o `AGENTS.md` ou o código-fonte. Consulte apenas as orientações atuais no início de `AGENTS.md` e o código pertinente. Não parar por divergência meramente histórica.

## Prioridade vigente da Direção (13/11/2026)

**Entrega por dispositivo, sem burocracia herdada:** APK Android local-first para teste no telefone real; painel desktop instalado via Chrome como estação principal; PR #19 como fonte do código e Supabase DEV para dados de teste. Fuzzy Zebra e Codespaces são auxiliares somente quando uma prévia privada web for solicitada. Build/instalação Android não dependem de deploy Cloudflare ou sincronização Codespaces. Preservar 1.0, segurança, registros e alterações locais, sem fingir homologação.

## Objetivo comercial anterior, preservado para etapa própria após a EducART 1.0

**Vender uma segunda ou terceira solução educacional**, sem desmontar a primeira:
1. Coordenação cria uma **solução** (curso/oficina), com descrição, ementa, áreas/disciplinas, público, duração, certificação e informações comerciais.
2. Coordenação cadastra um **professor** uma única vez, de forma privada, para reutilizá-lo em turmas diferentes; não criar outro login, CRM ou cadastro pessoal redundante.
3. Coordenação cria **turmas vinculadas à solução**; cada turma tem professor ativo, capacidade, local, dias e horários **próprios** (nunca herdados globalmente da solução).
4. Secretaria/Coordenação vincula **estudantes existentes ou individualmente recadastrados à turma** pelas operações de matrícula já existentes, sem duplicar cadastro, gerar dívidas ou confundir pré-inscrição com matrícula.
5. **Catálogo + inscrição pública por solução/turma** são o próximo elo **ainda NÃO IMPLEMENTADO/NÃO HOMOLOGADO**; não chamar o produto de multissolução vendável enquanto a rota `/formacao` anuncia apenas uma oferta e `/inscricao` envia a ficha da Formação de Atores.

## Fonte real, sem reinvenção

- Repositório: `educartsuporte-netizen/educart-portal`. `main` é o patrimônio da 1.0, **intocável sem autorização**.
- **Branch única de avaliação do ciclo 07/11/2026:** `autodev-r07-estudantes-codespaces-private-20261106` (**PR #19**). Recursos comerciais da PR histórica #22 foram incorporados aqui sem apagar o fluxo R15; **não continuar editando a #22** nem criar outro ramo concorrente. Uma implementação e uma validação do HEAD por vez.
- Componentes existentes: `apps/web/src/components/AdminPlanejamentoFormacaoTurmaDev.tsx`, `AdminDocentesDev.tsx`, `AdminVincularEstudanteTurmaDev.tsx`, `AdminMatriculaUnificadaDev.tsx` e `apps/web/src/components/InscricaoForm.tsx`.
- Referência comercial e pedagógica *real*, **não um default geral**: `apps/web/src/app/page.tsx` na `main` (Formação de Atores de dois anos, oito disciplinas, certificado e espetáculo; matrícula R$ 50, mensalidade R$ 320; turma específica Casa Gameleira, sábados 15h–17h). Preços, idade mínima e horários de cada solução/turma devem ser independentes.
- Supabase de **desenvolvimento**: projeto `esjrjzyvyhtzwgihcbsc`. **Não acessar o PROD `doygnsubiitencoyzjzk` para alterar, migrar ou popular sem autorização expressa.**
- Fonte da estrutura SQL R14: `supabase/security-review/EDUCART_11_DEV_SOLUCOES_DOCENTES_TURMAS_20261106.sql` e `EDUCART_11_DEV_DOCENTES_PRIVILEGIOS_MINIMOS_20261106.sql`. As migrações DEV foram aplicadas: **36 ao conferir em 06/11/2026**, número histórico a revalidar, não garantia eterna.
- Bancos e formulários devem continuar usando `formacoes`, `educart_docentes_dev`, `turmas` e `matriculas`. Não inventar tabelas paralelas de curso, turma, estudante ou preço sem verificar a necessidade.

## Prova antes de afirmar conclusão

- A R14 e a interface R15 estão reunidas nesta branch privada; **cadastro completo autenticado e venda da segunda solução ainda não foram homologados**. Cada novo commit exige novo CI no seu SHA.
- Executar os testes existentes em `apps/web/scripts`, sobretudo `testar-unificacao-dia-07-11.mjs`, e os bloqueios LIPE, TypeScript e build sem deploy. O Actions da branch fornece os testes repetitivos, sem acionar auditorias Copilot custosas ou vários agentes para repetir a mesma análise.
- Verificar esquema e RLS *reais* do Supabase DEV antes de qualquer SQL. Sem tabelas expostas a `anon` por acidente, sem `service_role` no frontend, sem DELETE de professores e sem alunos reais em teste.
- Antes de dizer **pronto**, demonstrar: curso em rascunho, professor cadastrado, turma com professor e horários próprios, vínculo estudantil, e *depois* inscrição/catalogação pública por oferta com autorização expressa para publicação. Distinguir **codificado**, **CI**, **E2E autenticado**, **homologado** e **produção**.
- Atualizar a PR #19 (branch única) e a fila existente #14 com impedimentos/evidências, não gerar documentos ou issues redundantes. Preservar a 1.0, o WhatsApp persistente contextual e `@acasagameleira`.

**Pedido vigente:** máxima execução verificável no destino certo (APK no Android, painel no notebook ou, quando requerido, Fuzzy web), com mínima repetição de chamados; nenhum deploy sem aceite. Não transformar itens históricos deste documento em bloqueios de demandas atuais.

> **DIREÇÃO ATUAL — SIMPLIFICAÇÃO RADICAL DO AUTODEV (14/11/2026) — PRIORIDADE SOBRE AS REGRAS HISTÓRICAS ABAIXO**
>
> A Direção **revogou a obrigatoriedade operacional** da LIPE, da Lei da Escalada/DEA, dos “15 lembretes” e dos rituais de ABRACADABRA. Esses textos permanecem apenas como histórico, **não como pré-condições, checklists, aprovações adicionais ou vetos**. Não exigir leitura integral dessas leis antes de cada tarefa, nem transferir burocracia aos outros agentes.
>
> **Novo procedimento único:** (1) entender a meta e a decisão mais recente; (2) verificar só o código/ambiente relevantes; (3) executar a menor solução suficiente com as ferramentas disponíveis; (4) testar proporcionalmente ao risco e ao destino solicitado; (5) apresentar o resultado real, sem inventar comprovação. Seguir até a meta ou um impedimento técnico real, sem pedir repetidamente para continuar.
>
> **Proteções técnicas que continuam:** não destruir trabalho/dados existentes; não expor segredos nem enfraquecer autenticação/RLS; não alterar produção nem executar operações destrutivas sem autorização correspondente; não declarar publicação, teste ou homologação sem evidência. Essas cautelas são práticas de engenharia, **não reativação das antigas leis**.
>
> **Publicação e APIs:** não bloquear uma prévia isolada por auditorias, APIs, serviços, Codespaces ou etapas não necessários ao destino solicitado. Usar autorizações já concedidas dentro de seu escopo; pedir autorização nova apenas para produção, operações destrutivas ou mudanças de escopo/risco. A publicação da candidata e a homologação são fatos distintos.
>
> As seções datadas abaixo são registros históricos e técnicos úteis, mas qualquer rito que contradiga esta direção fica **desativado**. Preservar referências e detalhes operacionais sem tratá-los como mandamentos.

# AGENTS.md — AutoDEV / EducART

## Direção vigente — experiência que move, não que acorrenta (13/11/2026)

**Critério de prioridade:** identificar primeiro a meta e o dispositivo solicitado pela Direção. As decisões históricas são fonte de aprendizado e preservação, não uma fila de obrigações a reexecutar. Em divergências, confrontar escopo, data e evidências; dar prioridade à decisão expressa mais recente compatível com as proteções de dados e o que já foi aprovado. Não presumir que apagar memória, chat ou arquivo elimina outras cópias ou referências.

**EducART 1.1 / PR #19:** foco operacional atual no **APK Android local-first em telefone real** e na evolução do **painel desktop instalado via Chrome**. Não exigir sincronização da Fuzzy Zebra, Codespaces, publicação Cloudflare, migração de dados, novos serviços ou nova arquitetura como pré-requisito para compilar, conferir ou instalar o APK. Para testes de prévia web privada especificamente solicitados, continuar usando a Fuzzy existente e preservar seus arquivos locais.

**Preservação prática:** não apagar a EducART 1.0, dados históricos, decisões aprovadas, segredos, acessos e trabalho não commitado; não mexer em produção nem declarar homologação não comprovada. A LIPE histórica continua no repositório e mantém suas garantias de preservação; sua nomenclatura e seus ritos antigos não devem obscurecer a meta operacional corrente. Um único destino verificável por tarefa, sem duplicação de documentos, chamados ou plataformas.


## PROVA REAL — verificação independente de toda entrega (direção, 07/11/2026)

**Regra permanente da direção:** sempre tirar a prova real antes de afirmar que qualquer tarefa, arquivo, código, pagamento, alteração ou entrega foi concluído. Resultado positivo de chamada de ferramenta é apenas evidência da operação; a prova exige **leitura ou inspeção independente do estado final no destino**.

1. **Executar e conferir:** após criar/enviar/editar, consultar novamente o destino correto (por exemplo, listar a pasta e abrir o arquivo no Drive; reler conteúdo/commit no GitHub; consultar dados no banco autorizado; testar na URL e sessão reais da prévia). Verificar identidade, conteúdo, localização e efeito esperado, na medida do acesso disponível.
2. **Classificar evidências:** distinguir executado, verificado no destino, verificado funcional/visualmente, conciliado, homologado e publicado; nenhuma etapa prova automaticamente outra. Em finanças, um comprovante Pix lido/arquivado não comprova baixa conciliada no extrato ou vínculo a uma matrícula.
3. **Falha ou limite:** se a conferência faltar ou falhar, não anunciar conclusão; declarar precisamente NÃO VERIFICADO, indicar o impedimento e corrigir com a menor ação segura possível. Não inventar saldos, acessos, dados, IDs, links ou resultados.
4. **Preservação:** conferir sem duplicar arquivos, gerar cobranças, alterar produção, gastar cota sem necessidade ou afetar o trabalho aprovado; manter LIPE e Lei da Escalada.

**Caso originador:** pasta Contabilidade — EducART havia sido criada, mas permaneceu vazia porque um PDF Pix enviado pela direção não tinha sido carregado. Corrigido em 07/11/2026: arquivo de Clarisse Lemos foi enviado ao Drive e conferido em leitura independente da pasta e do documento. Vínculo ao cadastro e conciliação financeira continuam pendentes.

## LIPE — LEI INTRANSPONÍVEL DE PRESERVAÇÃO EVOLUTIVA

**Referência histórica (sem obrigatoriedade):** [LEI_INTRANSPONIVEL_PRESERVACAO_EVOLUTIVA_AUTODEV.md](./LEI_INTRANSPONIVEL_PRESERVACAO_EVOLUTIVA_AUTODEV.md). Não é necessário ler antes de modificar. Preservar a versão 1.0, alterar só o autorizado e provar que nada aprovado foi perdido. **LIPE + DEA + 15 lembretes.**

**R01 / herança pública:** verificar `AUTODEV_R01_MANIFESTO_LIPE_2026-11-04.json` e rodar `node scripts/testar-r01-baseline.mjs` em `apps/web`. Os arquivos públicos protegidos devem manter os hashes, salvo autorização específica. Produção aprovada Cloudflare: commit `5844b0408a8e53c4c283916ef1a1310b753350c9`, distinto da candidata.

## Branch única obrigatória — EducART 1.1 / múltiplas janelas (07/11/2026)

- Repositório: `educartsuporte-netizen/educart-portal`.
- **ÚNICO DESTINO DE ESCRITA DO CICLO:** `autodev-r07-estudantes-codespaces-private-20261106` — PR **#19**. HEAD é móvel: verificar sempre antes de editar.
- Não criar branches/PRs de teste paralelas sem nova autorização da direção. PRs/branches anteriores são referências históricas, não destino de escrita. Outras janelas podem alterar o HEAD: conciliar alterações; não fazer force push, hard reset, rebase destrutivo ou descartar trabalho alheio.
- Um pedido = pequeno diff + teste no SHA exato + commit na mesma candidata. CI verde de commit anterior não homologa o atual. **Portão específico por destino:** APK Android exige build/artefato e teste de instalação/uso em telefone real; painel instalado no Chrome exige prova no aplicativo desktop e na origem web correspondente; Codespaces exige HEAD e sessão autenticada verificados somente quando a Fuzzy Zebra for o destino solicitado. Distinguir implementação, CI, teste real, homologação e produção.
- **Supabase DEV compartilhado**: `esjrjzyvyhtzwgihcbsc`. Git branch não isola dados. Verificar esquema/RLS, vínculos e alterações de outras janelas antes de SQL; evitar dados pessoais em testes. Banco de produção `doygnsubiitencoyzjzk` é intocável sem autorização.

## Portão de entrega conforme o dispositivo — GitHub ≠ APK Android ≠ app Chrome ≠ Codespaces (atualização de 13/11/2026)

**Erro de processo comprovado por capturas da direção:** CI verde não prova instalação do APK, atualização do app Chrome nem sincronização da Fuzzy Zebra. **O destino da tarefa define a prova:** para Android, validar APK compilado e instalado/testado em dispositivo; para desktop, validar interface executada no notebook; para prévia Codespaces, validar sincronização e visual autenticado. Não usar uma prova como substituta de outra. Não exigir a Fuzzy Zebra para liberar uma etapa de compilação/teste/instalação do APK.

1. **Código e CI:** ler o HEAD atual da branch única e testar esse **mesmo SHA**; CI verde significa somente código/testes aprovados no GitHub.
2. **Apenas se a tarefa envolver prévia Codespaces:** identificar a instância real ligada à URL que a direção usa, verificar branch, `git rev-parse HEAD`, `git status --short` e SHA remoto. Só sincronizar por avanço rápido quando a árvore estiver limpa; nunca descartar trabalho local, forçar `reset` ou criar outra instância sem ordem.
3. **Na prévia Codespaces:** confirmar que o servidor Next da porta privada 3000 está servindo o checkout atualizado; quando necessário, reiniciar de modo seguro o processo existente. `git pull` isolado **não prova** que o navegador já exibe o novo código.
4. **Quando o destino for a Fuzzy Zebra:** abrir a **mesma URL** do Codespaces, autenticar legitimamente e conferir os elementos e interações solicitados, em especial o posicionamento visual. Captura antiga, resposta HTTP 200 de login ou teste estrutural do JSX não equivalem à homologação visual.
5. **Dados:** se o pedido afeta banco, confrontar esquema, políticas e registros do **Supabase DEV real** com o código do SHA avaliado; jamais usar estado presumido nem alterar PROD.
6. **Relato honesto e contextual:** informar somente a prova que falta no destino solicitado. Se for APK, distinguir compilação, download, instalação e teste no telefone; se for desktop Chrome, distinguir código, versão hospedada e operação no notebook; se for Codespaces, verificar sessão, SHA e interface privada. Não citar ausência de Fuzzy Zebra como impedimento de tarefa exclusivamente Android. Não dizer "pronto" sem evidência.

**Transição segura:** só substituir uma versão em uso após conferir o novo destino e garantir retorno ao estado anterior. Os portões pertinentes são definidos pela tarefa e pelo risco efetivo; não carregar portões de Codespaces para a instalação Android. Nenhuma operação em produção, deploy ou liberação de porta privada sem autorização.

## ABRACADABRA — definição canônica e proibição de merge cego

**Consultar [ABRACADABRA.md](./ABRACADABRA.md) na raiz para entender e executar o comando.**
**ABRACADABRA = REPACTUAR · VERIFICAR · DESTRAVAR · PRESERVAR · REPORTAR.**
É obrigatório realizar o próximo avanço seguro até a meta, sem dar por concluída uma branch lateral ou commit. **NÃO realizar merge cego**: comparar ancestrais, diffs e funcionalidades; conferir o estado local da Fuzzy apenas se ela for o destino da operação; aplicar alteração mínima diretamente na candidata única; proteger trabalho não commitado. Commit remoto ≠ Codespaces sincronizado ≠ prévia visualmente verificada.

## ABRACADABRA — auditoria por destino; Fuzzy Zebra somente para prévia web (13/11/2026)

Quando a direção disser **ABRACADABRA**, mesmo isoladamente, executar o protocolo de repactuação, auditoria de continuidade e destravamento: consultar LIPE e decisões vigentes; confrontar código, Supabase DEV, GitHub/CI e o artefato/dispositivo efetivamente solicitado; consultar Fuzzy Zebra e prévia autenticada apenas quando fizerem parte da entrega; verificar regressões de agentes; separar freios necessários de burocracia; preservar o aprovado; reportar **ALINHAMENTO, FREIOS, REALIDADE, DIVERGÊNCIAS e PRÓXIMO AVANÇO**. Não declarar testes, sincronização ou prévia concluídos sem evidência.

**Prévia web opcional — Fuzzy Zebra:** o sincronizador existente está versionado, mas sua ativação no Codespaces real não foi comprovada. Usá-lo e validá-lo somente quando a Direção pedir prévia Codespaces; exigir CI do SHA, branch correta, árvore limpa e avanço rápido, sem reset ou exposição da porta. **Este item não participa da checklist Android ou da instalação Chrome.**

**Mecanismo versionado nesta candidata:** `.devcontainer/auto-sync-fuzzy.mjs`, iniciado pelo `.devcontainer/start-r074.mjs` no `postStartCommand` já existente. Só na Fuzzy Zebra real, a cada 3 minutos enquanto ligada, consulta HEAD remoto, CI do mesmo SHA e árvore local; somente permite fast-forward, sem criar workflow, outra prévia, serviço de deploy ou reiniciar Next arbitrariamente. Em caso de mudanças locais ou falhas, não sincroniza. **O monitor não inicia sozinho em um checkout que ainda não recebeu este commit. É necessário bootstrap uma única vez na Fuzzy Zebra, e validar ali o funcionamento real; GitHub verde não equivale a monitor ativo ou prévia homologada.**

**Prioridade operacional atual (13/11/2026):** concluir e homologar **o APK Android local-first no telefone** e evoluir **o painel desktop já instalado pelo Chrome no notebook**, mantendo o código na PR #19 e o Supabase DEV. Fuzzy Zebra é recurso auxiliar de prévia web, não etapa obrigatória para a entrega do APK. O APK nativo atual é incremento parcial e ainda requer teste real no Android; a instalação pelo Chrome não constitui app desktop offline. Build, download e instalação de APK não precisam de deploy Cloudflare. A integração dos contatos históricos segue como tarefa independente, sujeita a conferência, sem duplicação ou alteração de PROD.

## ABRACADABRA — continuidade até a meta (aditamento aprovado em 07/11/2026)

**Falha de comportamento reconhecida:** interromper uma solicitação após uma etapa intermediária e devolver ao diretor a ordem de “continuar”, mesmo havendo ferramentas, autorização e caminho seguro para alcançar a meta. **Correção obrigatória para AutoDEV e agentes:** a unidade de conclusão é a **meta do pedido**, não a chamada de ferramenta, o commit, a gravação no banco ou o relatório parcial.

- Ao receber uma meta autorizada, prosseguir autonomamente em ciclos curtos: fonte real → alteração mínima → teste pertinente → verificação no destino solicitado → reporte. Não interromper apenas porque um subpasso foi realizado ou porque o próximo subpasso exige outra ferramenta.
- A execução só pausa por decisão/credencial realmente indispensável, bloqueio técnico comprovado, risco relevante, proteção de produção ou ação destrutiva não autorizada. Explicitar o impedimento real e o menor caminho de recuperação; não inventar bloqueios.
- Respeitar a distinção entre idealizado, implementado, testado, sincronizado, visualmente comprovado, homologado e publicado. Se a ferramenta não alcançar uma dessas etapas, declarar **pendência**, sem chamar a meta de entregue.
- **ABRACADABRA** aciona tanto a auditoria de continuidade já existente quanto este mecanismo de **destravamento da execução**: identificar a meta pendente, consultar fontes e estado reais, eliminar paradas burocráticas e executar o próximo movimento seguro antes de reportar. A palavra não dispensa LIPE, autenticação, autorização, testes ou segurança.
- Atualizar o **registro canônico existente** (este AGENTS.md na branch vigente, com histórico Git) quando houver mudança de regra, decisão ou estado estrutural relevante. Não criar relatórios/arquivos repetidos por microetapa; nunca alegar atualização da memória interna do ChatGPT por editar Git. Referenciar no reporte o commit efetivamente gravado.
- Caso histórico separado da entrega APK: inventário de **539 inscrições históricas** no Supabase DEV, com **537 vínculos de pessoa**, **89 identidades provisórias** e **2 inscrições sem nome** informados na conferência de 07/11/2026. Esses totais não são estado atual garantido; revalidar no DEV quando a Direção retomar a integração dos contatos. Não converter inscrição em matrícula nem declarar aluno ativo sem prova. Não usar esta pendência para bloquear a entrega Android.

## R18 — documento contratual para download após inscrição (07/11/2026)

Decisão da direção: mostrar, no encerramento bem-sucedido da inscrição, download do PDF original da **minuta de contrato** enviada por Dimas, sem convertê-la em contrato aprovado ou assinável. O formulário da versão 1.0 é preservado, exceto pelo acréscimo autorizado e registrado no manifesto LIPE com hash R18; não há modificação na lógica de envio ou de elegibilidade. A inscrição não é matrícula; o download não equivale a assinatura, reserva, aceite, quitação ou cobrança. Futuro Pix e QR Code exigem nova decisão, dados da prestadora, condições individuais, revisão jurídica e controles de confirmação; nenhum meio de pagamento será implementado nesta etapa. Código na Candidata #19 e documento em `apps/web/public/documentos/EducART_Contrato_Oficina_de_Atores_MINUTA.pdf`; sem autorização de publicação.

## Ciclo mínimo de execução segura

1. Consultar código real, CSS, contratos, testes, LIPE e decisão mais recente; reutilizar componentes. Preservar marca, inscrição da 1.0, elegibilidade 14+, Casa Gameleira, acessibilidade, WhatsApp flutuante e mensagens contextuais.
2. Fazer mudança mínima e rastreável; antes de remover algo, identificar dependências e autorização. Rodar testes do caso, `scripts/testar-lei-preservacao.mjs`, `scripts/testar-acessibilidade-global-admin.mjs`, verificação R01, TypeScript e build remoto sem publicação.
3. Testar **sempre o painel administrativo**, incluindo `/admin/login`, `/admin`, navegação, desktop, celular, teclado, contraste, escala do texto e WhatsApp. Sem sessão autenticada: declarar explicitamente **E2E/dashboard autenticado pendente**; HTTP 200 do login não é homologação.
4. Autenticação DEV pelo Supabase Auth, autorização de papéis no servidor e RLS. Falhar fechado. Não expor segredos, remover proteções, abrir porta privada ao público, criar cobrança/ingresso automático ou acessar produção.
5. Sem merge, deploy, domínio `educart.pro`, Worker `educart-production`, alterações de produção ou exclusões irreversíveis sem aprovação específica. Se houver divergência ou regressão, parar e corrigir na branch antes de promover.

## Fonte única de instruções e arquivo histórico

- **Lei:** LIPE aprovada acima. **Operação atual:** este `AGENTS.md`. **Orientação complementar aos agentes:** `.github/copilot-instructions.md` e `GEMINI.md`, que remetem à lei e ao código — não criam normas novas.
- **Histórico:** relatórios, planos e políticas de fases anteriores foram retirados da raiz desta candidata; permanecem recuperáveis nos commits anteriores e, quando existentes, no Drive institucional. Títulos antigos como "VIGENTE" não substituem o HEAD atual. R05/R06 e provedores externos de portaria não são exigências atuais.
- **Não criar documento, cópia no Drive, issue ou PR por ajuste trivial.** Para código, Git diff/commit/CI/PR #19 bastam. O Drive institucional guarda decisões normativas, atas e histórico **quando a LIPE exigir**, com status, referência e commit; usar documento existente em vez de duplicá-lo. Aposentar workflows/PRs/branches somente depois de mapear dependências e preservar a cobertura de testes.

## Integração vigente da EducART 1.1

- A PR #19 reúne as áreas **Acadêmico, Gestão de inscrições, Secretaria/Coordenação e Financeiro**, a autonomia estudantil, **R15** de acesso rápido, **R14** de solução comercial guiada, cadastro privado de docentes e turmas com horários próprios.
- Fontes: `apps/web/src/components/AdminPlanejamentoFormacaoTurmaDev.tsx`, `AdminDocentesDev.tsx`, `AdminVincularEstudanteTurmaDev.tsx`, `AdminMatriculaUnificadaDev.tsx` e `InscricaoForm.tsx`. O SQL R14 está versionado e já foi aplicado ao DEV; **não reaplicar por sincronização Git**.
- O catálogo/inscrição pública por nova oferta e a venda de segunda solução **não estão homologados**. Nenhum deploy autorizado. A prévia privada Codespaces foi acessada; isso não substitui testes E2E autenticados completos. Consultar `.github/copilot-instructions.md` para lacunas reais.


## JUSTINO — Contabilidade de comprovantes; cotas apenas em situações relevantes (direção, 07/11/2026)

**Responsável funcional:** agente Contador Justino. **Atividade principal:** organização financeira documental da EducART — recebimento, leitura, classificação e arquivamento de comprovantes Pix enviados pela direção, sem criar cobranças, confirmar quitações automaticamente ou presumir recebimentos. A direção conserva as decisões e autorizações.

- **Pasta oficial:** Google Drive da conta EducART Suporte, [Contabilidade — EducART](https://drive.google.com/drive/folders/1JiOoE3HqvYbEV4YjLvDa_P3xHMZ-oRgO) (criada e verificada em 07/11/2026). Preservar arquivos originais, não publicar ou compartilhar sem autorização e evitar duplicações.
- **Classificação mínima de cada comprovante:** estudante; natureza = matrícula, mensalidade ou matrícula + mensalidade; competência (mês/ano, inclusive múltiplas competências quando comprovadas); valor; data do pagamento; identificação da transação quando legível; fonte/arquivo; status de identificação e conciliação. Dados não demonstrados ficam **pendentes**, não são inventados.
- **Vínculo com portal:** posteriormente, identificar com segurança a pessoa e a inscrição/matrícula no cadastro real e relacionar os comprovantes, evitando duplicidade. A direção citou **Clarice Lemos** como possível caso futuro, não como cadastro ou pagamento já confirmado. Consultar código real, papéis, autorização e estado do banco/ambiente antes de escritas; não confundir recibo enviado com baixa bancária conciliada e não alterar produção sem autorização adequada.
- **Corte temporal da auditoria financeira (07/11/2026, decisão da direção):** a prioridade é registrar e organizar os comprovantes recebidos **a partir desta data**, iniciando pelo PDF da mensalidade de novembro/2026 de **Clarisse Lemos** (R$ 300,00; pagador bancário diferente do nome da estudante). Buscar extratos bancários históricos de Aline, recuperar em massa comprovantes antigos e reabrir lançamentos anteriores **não são necessários nem autorizados por este escopo**, salvo nova decisão expressa. As divergências históricas anteriormente relatadas (inclusive receitas concorrentes da Barra/Nômades em agosto/2026 e dúvidas sobre bases de repasses) ficam **documentadas como não conciliadas e fora da auditoria corrente**, não como resolvidas, quitadas, apagadas ou corrigidas. Não alterar lançamentos; comprovante arquivado no Drive não substitui conciliação bancária nem vínculo no portal. Registrar, para cada novo comprovante, estudante, pagador, valor, competência, finalidade, data, identificador e estado de conferência, preservando a prova real no destino.
- **Tarefa secundária e ocasional:** acompanhar franquias, cotas, créditos, tickets e custos das ferramentas (ChatGPT/James, GitHub, Codespaces, Supabase, Drive, Cloudflare etc.) **somente quando solicitado**, especialmente antes de deploys ou operações de alto consumo. Separar dados medidos, estimados e indisponíveis; sugerir otimização sem degradar LIPE, segurança ou testes essenciais.
- **Dever dos agentes:** Silvio, Gero, Gary, James e os demais podem consultar este registro quando o trabalho envolver pagamentos, despesas, limites ou custos; Justino é a referência funcional. Esta anotação **não envia mensagens automaticamente a outras conversas**, não permite acesso automático a faturamentos externos e não executa reconciliação contínua.

> **PROTOCOLO HISTÓRICO DESATIVADO EM 14/11/2026.** O formato ritual de ABRACADABRA não é mais obrigatório. Se a Direção usar a palavra, tratá-la como pedido de verificar obstáculos e avançar diretamente, sem reler toda a legislação interna, sem impor relatório padronizado por rotina e sem inventar barreiras. Aplicar apenas verificações relevantes e os cuidados técnicos básicos descritos em `AGENTS.md`.

# ABRACADABRA — Protocolo operacional do AutoDEV

**Edição de referência:** 07/11/2026; atualização de prioridade por dispositivo em 13/11/2026  
**Natureza:** comando de continuidade, auditoria e destravamento da execução.  
**Autoridade:** determinação expressa da direção, subordinada à [LIPE](./LEI_INTRANSPONIVEL_PRESERVACAO_EVOLUTIVA_AUTODEV.md) e ao [AGENTS.md](./AGENTS.md) da branch vigente.

## O que significa

**ABRACADABRA = REPACTUAR · VERIFICAR · DESTRAVAR · PRESERVAR · REPORTAR.**

Quando a direção escreve `ABRACADABRA`, mesmo sem outra frase, a equipe executora **não responde apenas com um bordão**. Recupera a meta pendente, consulta o código e os registros reais, identifica divergências e bloqueios, e realiza o próximo avanço seguro que as ferramentas e autorizações permitirem. O objetivo é **a entrega funcionando no destino solicitado**, não a produção de um plano, de um commit ou de uma branch isolada.

## Ferramentas autorizadas e exclusão expressa (07/11/2026)

**TinyFish está excluído do AutoDEV/EducART por decisão expressa da direção.** Não utilizar TinyFish para pesquisar, navegar, automatizar, validar a Fuzzy Zebra ou executar qualquer etapa da EducART. Não sugerir recarga de carteira, pagamento, reativação ou dependência desse serviço. Sua indisponibilidade **não é bloqueio legítimo** do ABRACADABRA. Esta regra prevalece sobre recomendações genéricas de ferramentas e referências históricas; não apagar registros antigos apenas por mencionarem o serviço.

Priorizar **GitHub** (código, PR #19, CI e artefato APK), **Supabase DEV** (dados e permissões), **Google Drive** (documentos vigentes), **Android real** (homologação do APK) e **notebook Chrome** (painel desktop). Usar **Codespaces Fuzzy Zebra** somente quando a tarefa disser respeito à prévia web privada. Usar outras integrações somente quando pertinentes e autorizadas. Se o acesso remoto à sessão privada da Fuzzy Zebra não estiver disponível, verificar tudo que for possível pelas integrações permitidas, preservar a árvore local e registrar a falta de comprovação visual sem inventar um bloqueio de cobrança.

## Sequência obrigatória

1. **Repactuar a meta.** Identificar a decisão expressa mais recente e o dispositivo/artefato solicitado. Consultar os documentos e testes pertinentes, sem carregar todas as obrigações históricas para cada demanda. Não pedir novamente informações já confirmadas.
2. **Verificar a realidade.** Identificar repositório, branch canônica, SHA remoto, diferenças e árvore local de trabalho. Conferir Supabase DEV, permissões, rotas, CSS, testes e o destino escolhido (APK no telefone, app Chrome no notebook ou prévia Fuzzy Zebra). Sem acesso ao dispositivo/ambiente, não inventar estado local.
3. **Destravar sem perdas.** Alterar apenas o necessário, na **branch única vigente**, reutilizando componentes existentes. **PROIBIDO MERGE CEGO**: nunca mesclar linhas divergentes ou copiar arquivos integrais sem confrontar ancestrais, diffs, dependências e alterações de outros agentes. Preferir patches mínimos; parar em conflito, árvore suja, avanço não-fast-forward ou risco de sobrescrever trabalho.
4. **Integrar de verdade, sem amarras de outro destino.** Entregar na PR #19 e validar **apenas o alvo da demanda**: APK no telefone, painel desktop no notebook ou prévia Fuzzy Zebra quando expressamente solicitada. Não exigir Codespaces para gerar ou instalar APK; não exigir deploy Cloudflare para compilar. O sincronizador Fuzzy já versionado tem ativação real pendente e não constitui dependência do Android.
5. **Comprovar.** Executar verificações e CI do mesmo SHA, comparar diff e regressões; no Android validar integridade do APK e funcionamento real; no notebook verificar a interface e a versão acessada; quando envolver Fuzzy Zebra, conferir SHA da instância privada e testar no navegador autenticado. Para cartões e pop-ups: área toda clicável, cursor de mão, abrir e fechar janela, informações corretas, teclado/Escape e comportamento mobile.
6. **Preservar ambientes.** Nunca excluir trabalho local não commitado, alterar produção, expor a porta privada, desabilitar RLS, forçar push/reset/rebase ou publicar na Cloudflare sem autorização específica.
7. **Auditar resíduos.** Revisar branches temporárias criadas por falha de processo; classificar como: vazia (nenhum commit próprio), duplicada, divergente com trabalho útil ou histórica protegida. **Não apagar automaticamente**. Recuperar mudanças úteis na candidata com diff revisado, não por merge às cegas.
8. **Reportar sem ficção.** Distinguir **código escrito → integrado à PR #19 → CI/testes → artefato do destino (APK/web) → instalado ou executado → homologado**; acrescentar **sincronização Codespaces/prévia Fuzzy** somente em tarefas de prévia privada e **deploy/publicação** apenas quando expressamente autorizados. Informar bloqueios concretos e o menor passo seguro para resolvê-los.

## Escopo atual da EducART

- **Fonte do código:** `educartsuporte-netizen/educart-portal`.
- **Candidata única e PR:** `autodev-r07-estudantes-codespaces-private-20261106`, PR #19.
- **Destinos de homologação:** APK Android local-first no telefone (ainda não homologado) e painel desktop instalado no Chrome (candidata web, ainda dependente de hospedagem). **Prévia web auxiliar:** Fuzzy Zebra, Codespaces privado, porta 3000 privada; não é bloqueio para gerar/instalar APK.
- **Banco de desenvolvimento:** Supabase DEV `esjrjzyvyhtzwgihcbsc`.
- **Produção:** sem alterações por este comando.

A fonte de verdade é sempre o HEAD e o estado real verificados no momento da operação, **não** o nome de uma branch antiga guardado em memória. Se a direção mudar a candidata oficial, atualizar este registro na própria candidata com evidência.

## Proibição específica de merge cego

Antes de qualquer integração de outra branch:

- Comparar a branch de origem com o HEAD da candidata e identificar o *merge-base*; mapear arquivos e funcionalidades alteradas dos dois lados.
- Distinguir contribuição útil de código desatualizado ou divergente; reconstruir o patch mínimo **sobre o arquivo atual**, sem substituir o conjunto.
- Revisar dependências, rotas e contratos, executar testes e interromper ao encontrar conflito ou potencial perda.
- **Somente quando a operação envolver Codespaces:** preservar conteúdo local não commitado; um branch remoto não comprova o estado da Fuzzy.
- **Somente quando o destino for Fuzzy Zebra:** declarar integração após conferir SHA, serviço e navegador autenticado.

**Regra final:** o ABRACADABRA é um comando de **realização com preservação**. Se faltar prova ou acesso, declarar a pendência sem chamar a meta de concluída.

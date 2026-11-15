# AutoDEV — Diretriz permanente dos cinco critérios e sua aplicação às prévias

**Emissão:** 04/11/2026  
**Origem:** ordem expressa da direção: “sempre se pergunte” sobre autonomia, capacidade, integração, custo-benefício e segurança.  
**Estado:** diretriz operacional vigente, subordinada à **LIPE — Lei Intransponível de Preservação Evolutiva** aprovada em 04/11/2026.  
**Âmbito:** decisões técnicas, escolhas de ferramentas, propostas de integração, etapas de desenvolvimento, ensaios, prévias, homologações e operação em todos os projetos AutoDEV. Os exemplos da EducART não se estendem automaticamente aos demais projetos.

## 1. As cinco perguntas obrigatórias

Antes de recomendar ou utilizar uma ferramenta ou executar uma ação relevante, responder, com base em evidências disponíveis:

1. **Autonomia:** quanto trabalho consigo executar sem intervenção do Flip? Usar conectores e permissões existentes; não solicitar ao responsável trabalho manual que possa ser executado legitimamente. Separar **autonomia de execução** de **autoridade para aprovar**: nenhuma autonomia substitui a decisão expressa da direção em publicação, reforma de versão, alterações de dados reais, pagamentos ou outros atos reservados.
2. **Capacidade:** quais operações consigo realizar de verdade? Distinguir capacidade nominal/anunciada de ação testada no ambiente e operação ainda bloqueada. Nunca prometer funcionalidade, acesso, teste, automação ou deploy sem comprovação.
3. **Integração:** quão bem a ferramenta funciona com nossa infraestrutura? Conferir repositório, projeto, conta, autenticação, permissões, ambientes dev/prod, API, reversibilidade e compatibilidade. Não inferir uma integração da mera existência de credenciais, código ou documentação.
4. **Custo-benefício:** quanto custa alcançar o resultado? Considerar licenças, créditos, tempo, manutenção, consumo de recursos e risco de retrabalho. Preferir caminho nativo, direto, verificável e econômico que satisfaça o objetivo; evitar duplicação de ferramentas e buscas sem retorno.
5. **Segurança:** qual o nível de controle e proteção dos projetos? Verificar menor privilégio, separação entre ambientes, LGPD e dados pessoais, segredos, autenticação e autorização, trilha de auditoria, prevenção de regressões, rollback e confirmação explícita para atos sensíveis. **Falha crítica de segurança ou ausência de autorização é impedimento, mesmo que os demais critérios sejam favoráveis.**

## 2. Como aplicar o filtro sem burocracia

- Em tarefa simples, realizar uma avaliação mental rápida e agir dentro da autorização existente; não exigir um formulário do responsável.
- Em decisão técnica relevante, registrar brevemente: ferramenta/alternativas, o que foi **efetivamente verificado**, autonomia alcançável, limites, custo conhecido ou não apurado, riscos e decisão.
- Marcar evidências como **verificado**, **declarado/documentado**, **inferido** ou **pendente**. Não converter estimativa em fato nem atribuir valores sem fonte.
- Escalar à direção somente o que for uma decisão sua, um acesso não concedido, risco não mitigado ou escolha com efeito externo relevante.
- Se uma ferramenta não funciona ou não está conectada, buscar alternativa autorizada antes de transferir o trabalho ao Flip; não burlar credenciais, aprovações ou limites técnicos.
- O filtro não autoriza monitoramento autônomo fora da conversa; recorrência futura depende de automação realmente criada e autorizada.

## 3. Aplicação à política de prévias, testes e homologação

**Prévia de ideia:** esboço/protótipo explicitamente identificado. Não equivale ao site, ao build nem à funcionalidade real.

**Prévia técnica local ou artefato não publicado:** resultado extraído do código real, com branch/commit, diferenças e testes declarados; não é publicação.

**Prévia online:** deployment isolado, fora do domínio e do Worker de produção, sem dados reais, com rotas, variáveis, autenticação, proteção contra indexação e custo verificados. **Requer autorização expressa da direção para publicar a prévia, identificando o destino.** O pedido “faça e me mostre”, por si só, não a concede.

**Homologação:** aceite formal da versão candidata baseado em evidências de preservação LIPE, testes funcionais, segurança, responsividade, acessibilidade, comportamento de painel administrativo autenticado quando aplicável e plano de reversão. Uma prévia visual bonita não equivale a homologação.

**Publicação:** ato posterior e distinto, condicionado à autorização específica da direção, ao destino confirmado, à validação técnica e ao rollback. Homologação não é deploy. Não publicar preview, staging ou produção por iniciativa própria.

**Checklist das cinco perguntas para cada prévia:**

| Critério | Pergunta de conferência | Barreiras mínimas |
| --- | --- | --- |
| Autonomia | É possível produzir e inspecionar a prévia com ferramentas autorizadas sem depender de operação manual da direção? | Não assumir prerrogativa de publicar. |
| Capacidade | O que a prévia prova de fato: layout, build, fluxo testado ou operação real? | Não classificar demonstrações como integração ativa. |
| Integração | Branch, Worker, Supabase e domínios estão corretamente isolados? | Nunca usar `educart-production` nem `database-prod` para ensaio EducART. |
| Custo-benefício | O ambiente e os testes têm custos justificáveis? | Evitar deployments e serviços desnecessários. |
| Segurança | Há dados sintéticos, permissões mínimas, sigilo e rollback? | Bloquear prévia online se riscos essenciais não forem mitigados. |

## 4. Nota de continuidade EducART em 04/11/2026

- A referência R01 do Worker `educart-production` foi verificada e registrada no manifesto `AUTODEV_R01_MANIFESTO_LIPE_2026-11-04.json`; **não** significa homologação da EducART 1.1.
- R02 foi documentada como correção pontual do contexto do WhatsApp no laboratório; o manifesto também registra uma variação controlada de acessibilidade anterior à R03.
- O painel administrativo está integrado ao código do laboratório, mas a rotina acadêmica em `AdminRotinaAcademicaLab.tsx` contém dados fictícios e declara não acessar inscrições ou pagamentos reais.
- R03 (segurança administrativa, políticas RLS e autorização) permanece pendente de homologação. A migration `supabase/migrations/20261007_create_inscricoes_oficina.sql` contém políticas amplas `to authenticated using (true)`; verificar o **banco efetivo** antes de concluir o risco ou operar dados reais.
- Cada validação de interface deve considerar `/admin/login`, o `/admin` autenticado e as abas acadêmicas. Testes de código não substituem teste visual autenticado.
- **Nenhuma nova publicação, migração ou modificação da produção é autorizada por esta diretriz.**

## 5. Precedência e arquivo

1. A **LIPE** permanece integralmente superior; este documento a complementa sem reformar o texto canônico.
2. Registros mais antigos que interpretem “faça e me mostre” como autorização automática de preview online ficam superados pelo comando posterior e expresso de **proibição de qualquer deploy sem autorização específica**, inclusive preview e staging.
3. Registrar decisões em GitHub e no Drive institucional AutoDev, com leitura de verificação, sem chaves, senhas ou dados de estudantes.
4. Arquivamento documental **não** comprova operação executada, teste passado, homologação ou publicação.

**Regra executiva resumida:** *Executar o máximo legitimamente possível, comprovar o que funciona, integrar com eficiência, economizar recursos e jamais negociar a segurança ou a autoridade da direção.*

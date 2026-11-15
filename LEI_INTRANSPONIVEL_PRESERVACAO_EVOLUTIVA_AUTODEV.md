> **DOCUMENTO HISTÓRICO — OBRIGATORIEDADE REVOGADA PELA DIREÇÃO EM 14/11/2026.**
>
> A LIPE não é mais norma máxima nem condição de execução do AutoDEV. Seus artigos e ritos não podem impedir desenvolvimento, teste ou publicação autorizada por exigência meramente documental. Texto preservado para rastreabilidade e aprendizado. Permanecem exigíveis somente os cuidados técnicos e legais pertinentes ao risco concreto, como integridade dos dados, controle de acesso, proteção contra perda de trabalho, veracidade das evidências e autorização de mudanças em produção. A orientação vigente está no início de `AGENTS.md`.

# LIPE — LEI INTRANSPONÍVEL DE PRESERVAÇÃO EVOLUTIVA
## Compêndio Institucional AutoDEV — Edição aprovada em 04/11/2026

**Data de aprovação expressa:** 04/11/2026  
**Estado:** **EDIÇÃO APROVADA PELA DIREÇÃO — NORMA MÁXIMA VIGENTE DA AUTODEV; ADITAMENTO EXPRESSO DO CICLO DE VERSÕES EM 04/11/2026**  
**Instituição:** AutoDEV, com aplicação a todos os seus projetos  
**Aditamento expresso de 10/11/2026:** a Direção autorizou adaptar a regra de numeração e oficialização ao objetivo de liberar primeiro a gestão escolar essencial da EducART 1.1, evoluindo a 1.2 em seguida. Alterações normativas devem ser proporcionais e verificáveis; a reforma não dispensa proteção de dados, integridade, controles de acesso, homologação, backup, rollback ou autorização própria de alterações em produção. O texto anterior permanece recuperável no histórico Git.
**Aditamento expresso de 11/11/2026:** a Direção aprovou, em deliberação comunicada ao Gerente Elder, três esclarecimentos proporcionais: autorização prévia delimitada para atualizações repetidas de prévias isoladas; testes proporcionais ao risco com aproveitamento de provas válidas; e triagem fundamentada de defeitos secundários sem prejuízo dos bloqueios essenciais. A autorização para reformar a lei NÃO autoriza automaticamente deploy, migração, acesso a dados, nova despesa ou publicação da EducART 1.1. A deliberação do titular está comprovada; presença, ciência e voto dos demais participantes da convocação não foram presumidos.
**Fonte normativa anterior preservada:** edição original de `LEI_INTRANSPONIVEL_PRESERVACAO_EVOLUTIVA_AUTODEV.md`, na branch de laboratório do repositório `educartsuporte-netizen/educart-portal`, conteúdo anterior de SHA `b06938df8d9668df1864e413574df8b7a8a3a05a`. Seu conteúdo permanece no histórico Git e em cópia histórica identificada.  
**Natureza:** recompilação aprovada a partir dos artigos da LIPE original, das dez respostas expressas da direção e das decisões da Root. A direção aprovou formalmente o texto em 04/11/2026, exercendo a competência de reforma prevista no artigo 9º da edição original.  
**Regra editorial e histórica:** a edição anterior fica integralmente preservada no histórico Git e em cópia histórica identificada; a promulgação desta edição não apaga seus artigos, sua origem nem os respectivos commits. A aprovação desta lei é documental e não autoriza deploy ou alteração de dados/serviços.

> **ARTIGO FUNDAMENTAL — PRESERVAR ANTES DE ALTERAR.** A próxima versão nasce do código real da versão anterior aprovada, herda seus componentes, comportamentos, decisões e dados protegidos, e altera apenas o necessário dentro do escopo autorizado. Cabe a quem propõe a evolução demonstrar o que mudou e provar que nada aprovado foi perdido.

> **Mandamento operacional:** **Preservar a versão existente. Alterar só o necessário. Provar que nada aprovado foi perdido.**

## TÍTULO I — Autoridade, alcance e continuidade

### Art. 1º — Primazia institucional
1. A LIPE é a norma interna máxima de desenvolvimento, preservação e evolução da AutoDEV, aplicada a **todos os projetos**, não somente à EducART.
2. Esta primazia organiza a atuação dos agentes e colaboradores; não dispensa cumprimento da lei, proteção de dados, segurança ou autorização dos responsáveis.
3. A LIPE vigente só poderá ser reformada por decisão **expressa** da direção, documentada e sem apagar a versão anterior.
4. Normas específicas de cada projeto complementam a LIPE; quando divergirem, o conflito deve ser apresentado e resolvido mediante decisão rastreável, sem presumir autorização para mudar legado.

### Art. 2º — Herança real e versão-base
1. Cada nova versão usa **sempre o código real da última versão aprovada** como base verificável, identificada por repositório, branch, commit e, quando aplicável, versão publicada.
2. Protótipos, experimentos e versões candidatas não se tornam bases canônicas enquanto não forem aprovados.
3. A versão seguinte herda código, interface, identidade, fluxos, acessibilidade, documentação e dados históricos protegidos, salvo exceção específica autorizada.
4. Um pedido genérico para melhorar ou modernizar **não** autoriza remover ou substituir funcionalidade anterior.

### Art. 3º — Exceções e mudanças de escopo
1. Remover ou substituir função aprovada exige **autorização expressa da direção**, com justificativa, identificação de arquivos e registros, testes e plano de reversão quando cabível.
2. A autorização deve definir qual comportamento se altera e qual permanece protegido.
3. A aparência de equivalência não basta: a equivalência funcional deve ser verificada.

## TÍTULO II — Engenharia da preservação evolutiva

### Art. 4º — Proibição de substitutos ilusórios
1. É proibido apresentar HTML estático, imagem, maquete, reconstrução aproximada, símbolo genérico ou simulação como versão fiel da aplicação real.
2. Maquetes são permitidas **apenas como exploração de ideias** e devem ser rotuladas claramente como demonstração.
3. Componentes existentes devem ser reutilizados diretamente quando possível. Refatorações precisam de razão concreta, comparação e testes de equivalência.
4. Nunca anunciar integração real de atendimento, autenticação ou pagamentos quando existir apenas simulação.

### Art. 5º — Processo obrigatório de mudança
Antes de implementar, o agente deve: identificar a base e seus commits; ler código, estilos, dependências, testes e rotas envolvidos; delimitar o pedido e o que ficará intocado. Depois deve: aplicar **patches incrementais**; comparar diferenças; executar testes originais e de regressão; construir e validar a aplicação real; documentar resultados, riscos, limitações e reversão.

**Aplicação proporcional aprovada em 11/11/2026:** o rito acima aplica-se às mudanças de software na medida do impacto real. Mudanças exclusivamente documentais exigem conferência da fonte, comparação textual e registro, sem build ou testes de aplicação sem pertinência. Em mudanças de código, manter diff, testes automatizados pertinentes e regressões da área afetada; não repetir testes cuja evidência permaneça válida para a mesma versão, ambiente e contrato funcional.

### Art. 6º — Prova de preservação
1. **Comparação do código (diff) e testes automatizados** são evidências mínimas obrigatórias de preservação.
2. Para uma candidata verdadeira de release, valem também as exigências já existentes na LIPE: build real verificada, validação em desktop e celular, verificação das interações, auditoria de segurança pertinente, plano de rollback e autorização de publicação.
3. Provas devem distinguir: **proposto**, **codificado**, **testado**, **visualizado**, **homologado**, **publicado** e **revertido**.
4. Ausência de prova não pode ser disfarçada por declarações de conclusão.
5. **Proporcionalidade da prova (11/11/2026):** a profundidade dos testes varia com risco, alcance, contratos e dados atingidos. Provas anteriores só podem ser reaproveitadas quando sua validade para a versão, ambiente e escopo atual estiver demonstrada. Em release de aplicação real, mantêm-se build, testes de segurança pertinentes, inspeção autenticada, desktop/celular, possibilidade de reversão e autorização separada. Ausência de prova essencial continua bloqueante.

### Art. 7º — Integração do trabalho de outros agentes
1. Código produzido por Secretário, coordenação, agentes ou terceiros deve ser **adaptado incrementalmente ao projeto existente** — jamais substituir o sistema por um corpo paralelo.
2. Integrar exige checar modelos de dados, permissões, rotas, padrões visuais, acessibilidade e regressões antes de aceitar o trecho.
3. A autoria da contribuição será preservada nos registros, sem confundir produção de código com aprovação ou publicação.

### Art. 8º — Falhas, isolamento e reparação
1. Um módulo pode ser experimental e incompleto no laboratório. **Antes da publicação devem estar corrigidos e comprovados os defeitos novos que comprometam o escopo mínimo aprovado, direitos, dados pessoais, autenticação, autorização, integridade, estabilidade relevante, acessibilidade essencial ou funcionamento da jornada crítica.** Defeitos secundários sem risco material demonstrado e melhorias não essenciais podem ser diferidos somente após classificação fundamentada, rastreabilidade e aceite expresso da Direção; não podem ser ocultados ou declarados resolvidos.
2. Regressão ou incompatibilidade relevante bloqueia promoção de release; corrigir, testar novamente e documentar o resultado.
3. A direção estimula coragem criativa com isolamento: **ousar na criação, proteger a base, aprender com os testes, evoluir sem medo**.
4. Qualquer falha em dados pessoais, autenticação, cobrança ou estabilidade de produção exige rigor superior ao de um ajuste estético.

## TÍTULO III — Governo humano e autonomia assistida

### Art. 9º — Autoridade da direção
1. A direção determina visão, prioridades, mudanças excepcionais, critérios de aceite e permissão de publicação.
2. Agentes e ferramentas executam tarefas técnicas delegadas, informam incertezas e apresentam evidências; não se autoconcedem autoridade para reformar a lei, remover legado ou alterar produção.
3. A AutoDEV deve favorecer execução efetiva e autonomia operacional dentro dos limites autorizados, sem exigir que a direção domine servidores ou linguagens de programação.

### Art. 10º — Dever de transparência e relatório
1. Cada candidata será apresentada prioritariamente em **resumo objetivo das alterações, testes e riscos**, com o diff, logs, evidências e plano de reversão disponíveis para consulta.
2. O resumo indicará explicitamente o que foi preservado, o que foi modificado e o que não foi verificado.
3. Nenhuma ferramenta poderá afirmar execução, teste, deploy, pagamento ou aprovação sem evidência correspondente.

### Art. 11º — Colaboração e responsabilidades
1. As funções e acessos são definidos por projeto, por necessidade operacional e pelo princípio de menor privilégio.
2. Na EducART, Secretaria é apoio operacional da coordenação — acompanhamento de inscrições, chamadas e pagamentos —, não sinônimo de administrador irrestrito, contador nem agente de arquivamento da Root.
3. A direção informou que Aline e Felipe desempenham atribuições de coordenação e Secretaria na prática; identidade civil, cargo operacional e permissão técnica são dimensões distintas.
4. A contadora Paula Bárbara é referência futura para registros contábeis; qualquer integração requer validação de formato, acesso e responsabilidades, sem presumir conexão existente.

## TÍTULO IV — Ambientes, publicações e segurança

### Art. 12º — Laboratório e produção
1. Experimentos são realizados em branch e ambientes isolados, preservando snapshots, histórico de commits e dados reais.
2. **Nenhum deploy ocorrerá sem autorização expressa da Direção para o destino e escopo correspondentes.** A Direção pode, antecipadamente, autorizar um conjunto delimitado de atualizações de **uma prévia de desenvolvimento isolada**, com branch, destino, finalidade, escopo, condições de validade, restrições de rede e segredos e caminho de reversão definidos. Atualizações dentro desses limites não exigem novos comandos individuais. A autorização não alcança produção, alteração de domínio público, dados ou credenciais reais, novo destino nem mudança fora do escopo; tais atos exigem autorização específica.
3. Uma autorização de prévia não autoriza produção; a publicação final exige aprovação específica.
4. É proibido alterar silenciosamente domínio oficial, Worker de produção, banco de produção ou credenciais.

### Art. 13º — Dados, identidade e proteção
1. Inscrições, perfis, fotografias, pagamentos, históricos e direitos dos estudantes devem ser preservados; alterações e migrações exigem justificativa, rastreabilidade e aprovação própria.
2. Em laboratório, usar **dados fictícios/sintéticos**; não copiar dados reais implicitamente.
3. Autenticação e autorização devem ser verificadas no servidor e no banco, com permissões e RLS apropriados; esconder botões na interface não é controle de acesso.
4. Proteção de dados, acessibilidade, limites de upload, prevenção de abuso, backups e reversão integram o aceite técnico conforme o risco.

### Art. 14º — Pagamentos e integridade financeira
1. Cobrança gerada não é pagamento recebido. Eventos Pix ou cartão só alteram estado financeiro após confirmação confiável do provedor, com prevenção de duplicidade, conciliação e tratamento de reembolso/estorno.
2. Permissões do Secretário e da contabilidade devem ser segregadas.
3. Expectativas de repasse, inscrições e receitas efetivas são informações diferentes; nenhuma previsão autoriza despesa, contratação ou alteração de infraestrutura automaticamente.

## TÍTULO V — Memória institucional e infraestrutura

### Art. 15º — Três camadas de memória e evidência
1. **GitHub:** fonte de verdade do código de cada projeto, branches, commits, diffs, testes, histórico e textos técnicos versionados.
2. **Google Drive institucional / AutoDev:** arquivo de normas, decisões, auditorias, atas, mapa de responsabilidades e histórico administrativo, com ligação à versão de código correspondente.
3. **Conversa de trabalho:** espaço de direção e deliberação, cujas decisões normativas relevantes são formalizadas nos repositórios próprios quando as ferramentas estão acessíveis.
4. Evitar cópias redundantes e divergentes. Se uma transcrição for necessária, referenciar a fonte canônica, edição, data e hash/commit, marcando claramente a função da cópia.
5. Não registrar senhas, tokens, dados pessoais de estudantes nem comprovantes sensíveis em normas e logs gerais.

### Art. 16º — Registro normativo obrigatório
1. Cada movimento normativo aprovado deve ser registrado na pasta institucional **AutoDev** durante a interação em que for definido, com classificação de status e referência à fonte.
2. Alterações de código e normas devem ter rastreabilidade entre pedido, decisão, arquivo, commit, teste, autorização, deploy e eventual rollback.
3. Em caso de bloqueio de ferramenta, registrar o que foi efetivamente salvo e o que ficou pendente, sem alegar sincronização automática ou permanente.
4. Recompilar ou ampliar uma lei não apaga sua redação anterior; versões são encadeadas por histórico de alterações.

### Art. 17º — Custos, infraestrutura e resiliência
1. Preferir arquitetura sustentável e proporcional ao estágio de cada produto; despesas recorrentes ou expansão de planos exigem decisão informada da direção.
2. Proteger contra abuso, bots, uso indevido de upload, excesso de consumo e cobranças inesperadas.
3. Manter plano de recuperação, separação de credenciais e ambientes, capacidade de observar falhas e retornar à versão aprovada.

## TÍTULO VI — Aplicação específica: EducART

### Art. 18º — Evolução orgânica das versões
1. **EducART 1.0** permanece como referência pública protegida até a publicação comprovada da próxima versão oficialmente homologada. A 1.1 incorpora gestão acadêmica e Secretaria com herança da 1.0. Quando a 1.1 for instituída, ela se torna a nova base principal de preservação da LIPE, sem perder a rastreabilidade histórica; o mesmo ocorrerá sucessivamente com a 1.2 e outras versões aprovadas.
2. A expressão **EducART 2.0 Lab** é identificação histórica de trabalho experimental, não prova de que a versão comercial 2.0 foi lançada.
3. O rótulo público **EducART 2.0** só será utilizado após **primeira venda efetiva e confirmada**, dentro de `educart.pro`, de produto diferente da **Oficina de Atores** (por exemplo, canto, dança ou rap), via Pix ou cartão, mais autorização expressa da direção para a denominação/publicação.
4. Catálogo, inscrição pendente, botão de compra ou pagamento não confirmado não satisfazem o marco.

5. **Reforma expressa da Direção em 10/11/2026 — ciclos adaptativos:** a regra de 04/11/2026 que impedia a oficialização de versões ímpares foi superada. A **EducART 1.1 é candidata a lançamento incremental da gestão escolar essencial**, enquanto a 1.2 permanece em evolução. A numeração não aprova nem veta uma publicação: o que determina prontidão são escopo, segurança, testes reais, homologação, plano de recuperação e autorização específica. O regime par/ímpar anterior permanece apenas no histórico versionado.
6. **Preservação proporcional:** manter ciclos de avanço e estabilização conforme risco e necessidade, sem obrigatoriedade de paridade numérica. Melhorias secundárias podem seguir para a próxima versão quando identificadas, rastreadas e não indispensáveis ao funcionamento seguro do escopo publicado. Defeitos que afetem direitos, dados pessoais, autenticação, autorização, integridade acadêmica, financeiro ou jornada essencial não podem ser ocultados nem postergados para simular prontidão.
7. **Auditar não significa aprovar:** os 25 itens e as cinco ressalvas colhidas na auditoria da 1.1 permanecem rastreáveis. A Direção redefiniu em 10/11/2026 a prioridade de entrega: liberar primeiro a gestão escolar mínima e continuar os demais aperfeiçoamentos na 1.2. A triagem separa requisitos obrigatórios do escopo seguro da 1.1, melhorias diferíveis e falhas bloqueantes, sem descartar funcionalidades já implementadas ou transformar cadastros não conferidos em estudantes oficiais.
8. A transição entre números de versão exige herança da última base aprovada, registro de ressalvas e decisões, classificação de riscos, diff, testes de regressão, validação visual/autenticada pertinente, documentação e autorização separada de publicação. A numeração, por si só, não promove nenhuma candidata a produção.

9. **Critérios mínimos da candidata EducART 1.1:** acesso autenticado com papéis efetivos e RLS; persistência e consulta segura de pessoas, formações, turmas e vínculos pendentes; confirmação documental pela Coordenação; migração aditiva de esquema compatível com produção, incluindo dependências e auditoria necessárias; preservação verificável de inscrições e perfis já existentes; teste de negativa de acesso, duplicidade e integridade; comprovação da versão servida e da jornada no navegador. O conjunto de cinco ressalvas históricas — vínculos a partir de pré-cadastro com conferência financeira, CSV correto, perfil/foto de estudante, Pix manual e controle de adimplência — permanece no inventário e deve ser reavaliado por risco e dependência, integrando a 1.1 somente no que for indispensável à sua operação segura; o restante segue no ciclo 1.2 com prioridade explícita. Nenhum Pix é considerado quitado sem conferência real e nenhum perfil é publicado automaticamente.
10. **Evolução 1.2:** consolidar pendências, corrigir lacunas e aperfeiçoar a experiência após a 1.1, preservando a nova base homologada. A janela de revisão de prontidão de 13 a 14/11/2026 é objetivo de avaliação, não prazo automático de publicação, substituição de testes ou autorização de deploy. A 1.0 continua intocada até que outra versão seja efetivamente homologada e publicada por comando específico.


11. **Precedência da decisão superveniente:** a proibição de oficializar 1.1 e a obrigatoriedade de publicar apenas versões pares, aprovadas em 04/11/2026, ficam expressamente substituídas nesta matéria pela decisão da Direção de 10/11/2026. Preservam-se integralmente os arts. 5º–16º, 21º, a LIPE, a Lei da Escalada, direitos de terceiros, a segregação DEV/PROD e a necessidade de autorização específica de migração, merge e publicação. O nome público **EducART 2.0** continua condicionado ao marco comercial do §3º e à autorização expressa.

### Art. 19º — Experiência do estudante e continuidade
1. Preservar a identidade, navegação e inscrição aprovadas na 1.0, incluindo a experiência de WhatsApp flutuante **persistente e contextual**, sem substituição por ícone ou atalho aproximado.
2. Preservar informações efetivas de turma, horário e localização — como Casa Gameleira, 15h–17h e `@acasagameleira` — enquanto aprovadas para o produto correspondente.
3. Para os perfis futuros, a direção fixou **uma foto por estudante, até 5 MB**, acompanhada de orientações de apresentação (rosto nítido, fundo neutro, iluminação adequada) e visualização ampliada ao toque/clique, respeitando privacidade.
4. Incorporar cadastros existentes ao login apenas **após auditoria e autorização específica**, evitando duplicação, perda ou exposição de informações.

### Art. 20º — Administração e perspectivas financeiras da EducART
1. O painel administrativo deve concordar com a experiência da 1.0; o trabalho da Secretaria deverá ser integrado ao mesmo organismo de maneira incremental.
2. Pagamentos feitos dentro da plataforma devem futuramente alimentar registros administrativos e, mediante desenho validado, os registros usados na contabilidade de Paula Bárbara.
3. A verba comunicada de **R$ 10 por estudante** é previsão, não receita comprovada; número elegível, regras, periodicidade e recebimento ainda precisam de verificação.
4. O projeto deve manter separadas a projeção financeira, a receita efetiva e a capacidade técnica de armazenamento.

## TÍTULO VII — Vigência, auditoria e reforma

### Art. 21º — Procedimento mínimo para cada evolução
**Pedido → identificação da base aprovada → leitura do legado → escopo protegido → patch incremental → diff → testes e build → inspeção real e segurança pertinente → resumo de alterações, testes e riscos → autorização específica → publicação autorizada → verificação e possibilidade de rollback.**

**Proporcionalidade do procedimento (reforma de 11/11/2026):** o rito de evolução do código aplica-se segundo risco e alteração efetiva; mudanças puramente documentais não demandam build, prova visual ou regressão sem pertinência. Provas anteriores com mesma versão/ambiente/contrato podem ser reutilizadas, permanecendo obrigatórias as provas essenciais e as autorizações para o release.

**Procedimento complementar para todas as linhas AutoDEV:** planejar avanço funcional e estabilização em ciclos alternados, conforme natureza e escopo do projeto. Primeiro auditar e coletar ressalvas; depois corrigir e comprovar; somente então obter aceite expresso para congelar a base herdável. **Checklist percorrido ≠ checklist aprovado; prévia online ≠ homologação; homologação ≠ autorização de produção.** Na EducART, **qualquer versão numerada poderá ser candidata à oficialização**, inclusive a 1.1, desde que a Direção autorize especificamente após prova de prontidão; os ciclos são adaptáveis e a numeração não dispensa nem cria barreiras artificiais aos controles de segurança. O marco extraordinário de uso público do nome **EducART 2.0** segue condicionado ao evento comercial do art. 18, §3º e à autorização específica, mesmo sendo versão par.

### Art. 22º — Precedência e resolução de conflitos
1. A preservação evolutiva é o cerne que orienta as demais regras deste compêndio.
2. Entre uma instrução genérica de modernização e uma função anterior aprovada, prevalece a preservação até que a direção autorize a mudança específica.
3. Entre uma maquete e a aplicação real versionada, prevalece a aplicação real para qualquer afirmação de fidelidade técnica.
4. Um desejo de velocidade não elimina testes, proteção de dados, autorização de publicação ou veracidade de estado.
5. Eventuais conflitos entre normas deverão ser classificados, relacionados à fonte e submetidos à decisão da direção, mantendo intacta a lei vigente até eventual reforma aprovada.

### Art. 23º — Reforma formal
1. Esta edição foi **expressamente aprovada pela direção em 04/11/2026** e passa a ser a LIPE vigente no âmbito da AutoDEV.
2. Toda reforma futura exige nova aprovação expressa, comparação com a edição anterior, data, escopo, registro de decisão e histórico verificável no GitHub e no Drive institucional.
3. A LIPE original permanece preservada e recuperável. A evolução da própria lei obedece à preservação evolutiva.
4. A reforma pontual de 10/11/2026, expressamente autorizada pela Direção, modifica apenas a paridade obrigatória e o escopo de prontidão da EducART 1.1/1.2; os textos anteriores são preservados pelo histórico versionado. Nenhuma mudança de banco, código funcional, credenciais, domínio ou produção decorre automaticamente dessa aprovação normativa.
5. **Reforma de 11/11/2026:** a Direção aprovou expressamente as três propostas mínimas apresentadas pelo Gerente Elder: autorização antecipada delimitada de prévia isolada, provas proporcionais e triagem segura de defeitos secundários. A manifestação individual do titular não comprova comparecimento ou voto de outros funcionários convocados. A redação anterior permanece no commit pai; não houve por esta deliberação autorização de merge, deploy, migração ou operação em PROD.

---

## ANEXO A — As dez deliberações expressas da direção

1. Alcance: **todos os projetos AutoDEV**.
2. Base: **código real da versão anterior aprovada**.
3. Contribuições de outros agentes: **adaptação incremental ao código existente**.
4. Remoção/substituição: **somente com autorização expressa**.
5. Evidência mínima selecionada: **comparação de código e testes automatizados**, sem dispensar demais condições para release real.
6. Maquetes: **exploração de ideias**, nunca release.
7. Defeitos novos da 1.1: **corrigir antes da publicação os que afetem escopo essencial, dados, direitos, segurança, acesso, integridade, estabilidade relevante ou acessibilidade indispensável**; defeitos comprovadamente secundários podem ser diferidos apenas mediante classificação e aceite expresso da Direção, nos termos do Art. 8º e do Art. 18º.
8. Conflito visual: **preservar funcionamento e adaptar o visual**.
9. Dados reais para perfis: **após auditoria e autorização específica**.
10. Comunicação de candidata: **resumo objetivo de alterações, testes e riscos**, com evidências consultáveis.

## ANEXO B — Fonte, proveniência e escopo da recompilação

- **Fonte histórica primária (LIPE original):** `https://github.com/educartsuporte-netizen/educart-portal/blob/autodev-laboratorio-editavel-2026-11-03/docs/historico/LIPE_EDICAO_ORIGINAL_2026-11-04.md`, SHA de conteúdo `b06938df8d9668df1864e413574df8b7a8a3a05a`.
- **Transcrição institucional existente:** `https://docs.google.com/document/d/1H4DQs8yZTyrW8BsDw_PRcU5YjvYFPuQtsj4xT9MyolI/edit`.
- **Síntese das decisões EducART:** `https://drive.google.com/file/d/1YDhh885XLDagWt2giMOulR_RhLs6Deeo/view`.
- **Norma de coesão 1.1:** `https://drive.google.com/file/d/1bwRH-1wZK71jhcfQE9TBAIqUk1qk7mY-/view`.
- **Marco da versão 2.0:** `https://drive.google.com/file/d/1Y2OQ5m---NUw5WDpe-xQ-cVVV8QhC8VK/view`.
- **Regra de arquivamento:** `https://drive.google.com/file/d/13qJAFI0naIYFNuEHc20eD5dlw_KkYsa3/view`.
- **Fonte das dez respostas:** direção nesta conversa Root em 04/11/2026.

**Nota de interpretação:** os artigos 1º–17 e 21º–23 consolidam regras transversais aprovadas; os artigos 18º–20 aplicam decisões específicas da EducART sem estendê-las indevidamente a todos os projetos. Elementos como segurança, políticas de acesso e prestação de contas foram sintetizados das normas existentes e incluem parâmetros técnicos normativos; nenhum fato de implementação é inferido a partir de uma decisão conceitual.

**PROMULGAÇÃO:** a direção aprovou esta edição em 04/11/2026, em resposta à minuta apresentada na conversa Root. A publicação documental da LIPE em repositório e Drive não constitui publicação do site nem autorização para alterar bancos, integrações de pagamento ou serviços de produção.

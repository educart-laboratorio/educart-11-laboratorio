# LIPE — LEI INTRANSPONÍVEL DE PRESERVAÇÃO EVOLUTIVA
## Norma máxima AutoDEV / EducART: preservar o código, evoluir por mudanças controladas

**Sigla oficial:** **LIPE**  
**Denominação:** Lei Intransponível de Preservação Evolutiva  
**Instituição:** EducART / AutoDEV  
**Status:** norma máxima de desenvolvimento, determinada expressamente pela direção em 04/11/2026.  
**Âmbito:** EducART 1.0, candidata 1.1 e todas as versões, módulos, tarefas, agentes, protótipos, refatorações, testes e publicações posteriores.  
**Fonte oficial de código:** repositório GitHub `educartsuporte-netizen/educart-portal`.  
**Regra central:** **a próxima versão nasce do código real da anterior e a preserva; nunca nasce de uma reconstrução aproximada.**

> **LIPE, ARTIGO FUNDAMENTAL — PRESERVAR ANTES DE ALTERAR.** Nenhum trabalho do AutoDEV pode ignorar, substituir por imitação, refazer desnecessariamente ou degradar um componente, recurso, decisão funcional ou experiência já implementada e aprovada nas versões precedentes. Todo desenvolvimento deve concentrar esforço na diferença solicitada, mantendo por herança verificável tudo que já funciona.

### Artigo 1º — Autoridade do código anterior
1. A **EducART 1.0** é a origem e a autoridade das experiências públicas já aprovadas.
2. A **EducART 1.1** deve incorporar toda a 1.0, somando somente modificações e funções autorizadas. A **1.2** herdará a 1.1; assim sucessivamente.
3. Código, interface, identidade visual, semântica, navegação, acessibilidade, WhatsApp contextual fixo, Casa Gameleira, horários, inscrição, proteção de dados, regras de idade, gestão e históricos fazem parte da herança a preservar conforme estejam implementados.
4. A direção pode **autorizar expressamente** uma alteração ou remoção de característica específica. Essa exceção deve estar identificada no escopo e no registro do commit. Um pedido genérico de evolução **não** é autorização para apagar o legado.

### Artigo 2º — Proibição de reconstruções substitutivas
1. **Proibido** substituir a aplicação real por HTML estático, maquete, imagem, réplica visual ou código escrito do zero e apresentar o resultado como candidata fiel à publicação.
2. **Proibido** recriar manualmente um componente existente que possa ser importado ou reutilizado do repositório, salvo refatoração expressamente justificada e acompanhada de testes de equivalência.
3. Exemplos de falha proibida: usar um símbolo genérico no lugar do SVG oficial de WhatsApp; alterar a experiência da home enquanto se afirma preservar a 1.0; simular atendimento ou pagamento como se estivesse ligado ao banco real.
4. **Proibido** confundir apresentação estética, demonstração sintética, teste de integração, aplicação compilada e deploy homologado. Todo artefato deve ser rotulado pelo que **realmente** é.

### Artigo 3º — Método obrigatório de trabalho
Antes de cada mudança:
1. **Identificar** a branch, o commit e os arquivos existentes que implementam a função.
2. **Ler** os componentes originais, seus estilos, dependências, rotas e testes; não adivinhar comportamento.
3. **Delimitar** exatamente o pedido e os elementos da versão anterior que permanecem intocados.
4. **Editar incrementalmente** na branch de laboratório, preferindo patches pequenos e reutilização do código.
5. **Comparar** o diff com a base; explicar tudo que foi adicionado, modificado, removido e preservado.
6. **Executar** os testes preexistentes e novos testes de regressão relevantes.
7. **Construir e visualizar** a aplicação real em ambiente isolado. Uma maquete só pode ser demonstrativa, nunca prova de deploy.
8. **Registrar** commit, status dos testes, limitações e eventuais riscos antes de solicitar aceite.

### Artigo 4º — Candidato verdadeiro de release
Uma candidata para substituir a versão online só pode receber esse nome quando:
- Derivar do **repositório de aplicação real**, no commit identificado.
- Preservar os componentes aprovados — incluindo o WhatsApp flutuante correto e seus textos contextuais.
- Ter build real verificada e testes automatizados de não regressão aprovados.
- Ser validada em desktop e dispositivos móveis, com ações reais distinguidas de ações demonstrativas.
- Passar por auditoria de autenticação, RLS, privacidade, pagamento e segurança sempre que essas áreas forem afetadas.
- Dispor de comparação de diferenças, plano de reversão e autorização inequívoca de publicação.

**Sem essas condições, o artefato é uma DEMONSTRAÇÃO, nunca uma RELEASE PRONTA.**

### Artigo 5º — Banco de dados e continuidade
1. A migração de inscrições, usuários, perfis, pagamentos e fotos não pode ocorrer implicitamente.
2. Dados reais ficam segregados de testes; usar dados sintéticos nos ambientes isolados.
3. Nenhum dado histórico pode ser substituído, descartado, reclassificado ou importado sem regra auditável e aprovação própria.
4. Controle de acesso deve ser validado no servidor/banco; esconder botões no navegador **não** constitui autorização.
5. A identidade da EducART e os direitos de usuários não podem regredir ao acrescentar novos módulos.

### Artigo 6º — Publicação e autoridade da direção
1. Uma autorização de prévia **não** autoriza publicação.
2. É vedado alterar `educart.pro`, o Worker `educart-production` ou o banco de produção por iniciativa do agente.
3. A direção deve autorizar **separadamente** qualquer mudança de produção.
4. O agente deve preferir bloquear uma entrega duvidosa a anunciar falsamente uma versão pronta.

### Artigo 7º — Tecnologia a serviço da criação
O GitHub guarda o código, seu histórico e a rastreabilidade. O agente deve concentrar seu trabalho em **modificar e melhorar** a aplicação, não em repetir tarefas de armazenamento, criar cópias desnecessárias ou gerar substitutos descartáveis. Cada nova versão tem uma base inequívoca e reutiliza o acervo técnico existente.

### Artigo 8º — Falhas e reparação
Se houver regressão, divergência entre prévia e código, componente improvisado ou informação falsa de prontidão:
1. Interromper qualquer promoção de release.
2. Apontar a diferença exata sem justificá-la com a palavra “prévia”.
3. Corrigir preferencialmente o arquivo real ou a ferramenta de apresentação que introduziu o erro.
4. Criar ou reforçar o teste específico para impedir repetição.
5. Reexecutar a validação; documentar o resultado e manter produção intocada.

### Artigo 9º — Precedência e vigência
A LIPE tem prioridade sobre sugestões genéricas de reescrita e sobre protótipos paralelos. É orientação permanente para todo trabalho no repositório e deve ser lida pelo agente antes de alterar o projeto. **A lei não é um mecanismo tecnicamente imutável**: a direção conserva autoridade para reformá-la expressamente, mediante registro inequívoco e preservação do histórico. Nenhum agente pode afastá-la por conveniência, pressa ou preferência estética.

---

**Mandamento operacional da LIPE:** **Preservar a versão existente. Alterar só o necessário. Provar que nada aprovado foi perdido.**

**Proveniência:** determinação expressa da direção após divergência identificada no ícone do WhatsApp da prévia HTML da candidata EducART 1.1. A versão 1.0 já possuía SVG e comportamento contextual corretos; a prévia reconstruída substituiu o original por uma aproximação. O episódio fundamenta a presente norma.

**Implantação documental:** em branch de laboratório, sem deployment nem mutação de produção.

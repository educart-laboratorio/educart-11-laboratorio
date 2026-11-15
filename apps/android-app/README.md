# EducART 1.1 — Android local-first (candidata DEV)

Primeiro incremento integrado na PR #19, sem alterar a EducART 1.0.

## Executa no próprio aparelho
- **MainActivity nativa** abre sem internet. Sem WebView nem hospedagem da interface local.
- Conta institucional faz login individual via Supabase Auth DEV; RLS e membership
  \`portal_admins\` + \`equipe_papeis\` são conferidos em toda sincronização.
- Turmas, pessoas e matrículas somente leitura são copiadas sob demanda para
  **cache cifrado AES-GCM/Android Keystore**, sem backup Android.
- Pesquisa básica de pessoas e turmas já sincronizadas funciona sem internet.
- Novos alunos podem ser preparados em **rascunho local cifrado**.
- Envio de rascunho ao DEV é **manual**, com confirmação explícita, via RPC
  \`educart_r12_vincular_estudante_turma_dev\`, apenas como vínculo pendente.
  Nunca gera cobrança, convite ou matrícula financeira.
- **Sem reenvio automático**: antes de qualquer RPC o rascunho é marcado para
  revisão; se houver falha de rede, conferir no painel para evitar duplicação.
- A gestão web aprovada continua acessível dentro do APK via botão
  **Abrir gestão web completa (online)** e a atividade Android original preservada
  como \`GestaoOnlineActivity\`.

## Limites honestos
- Não é a transposição completa de todas as telas Next.js da 1.1.
- A interface nativa inicial é um módulo adicional real, não uma cópia visual
  da aplicação web nem uma prova de paridade funcional.
- Sem internet, não executa RPC, autenticação inicial ou sincronização.
- Somente dados já sincronizados ficam disponíveis offline.
- Cache offline de dados pessoais depende da segurança física do aparelho;
  evitar instalar APK debug em aparelhos não confiáveis.
- Google Drive não é integrado ao APK. OAuth e sincronização Drive requerem
  implementação e autorização próprias.
- Não há publicação, acesso de produção nem alterações em banco.
- O APK debug ainda requer homologação em telefone real.
- Chave publicável Supabase DEV no cliente NÃO é chave administrativa.
  Autorização efetiva decorre do JWT e das políticas RLS.

## Construção e validação
\`gradle -p apps/android-app :app:assembleDebug --no-daemon\`

\`node apps/android-app/scripts/testar-local-first.mjs\`

Candidata única: GitHub branch
\`autodev-r07-estudantes-codespaces-private-20261106\`, PR #19.

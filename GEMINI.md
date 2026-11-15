# EducART — orientação para Gemini

**Este arquivo é um apontador, não outra norma.** Para qualquer tarefa, ler nesta ordem:
1. [LIPE aprovada](./LEI_INTRANSPONIVEL_PRESERVACAO_EVOLUTIVA_AUTODEV.md).
2. [AGENTS.md](./AGENTS.md) — regra operacional VIGENTE, branch e testes.
3. [.github/copilot-instructions.md](./.github/copilot-instructions.md) e **código real** no HEAD.

**Ciclo EducART 1.1:** editar somente `autodev-r07-estudantes-codespaces-private-20261106` (PR #19), após conferir SHA e alterações concorrentes. Supabase DEV compartilhado; produção 1.0/Cloudflare protegida.

**Ambiente por destino (13/11/2026):** APK Android local-first em teste no telefone; painel desktop instalado pelo Chrome com backend web; GitHub CI e Supabase DEV. Codespaces Fuzzy Zebra é prévia privada auxiliar, somente quando requisitada; nunca exigir sincronização Fuzzy nem deploy Cloudflare para compilar, verificar ou instalar o APK. Não seguir instruções antigas de plataformas ou branch anterior. Não fazer deploy nem apagar dados sem autorização.

**Economia:** uma mudança = código + testes + commit na PR; não criar documentos, cópias no Drive ou branches redundantes. O conteúdo antigo deste arquivo está preservado no histórico Git (blob `f4959a0cb6de65a29ba2a2a90d8d5dc24b368e77`).

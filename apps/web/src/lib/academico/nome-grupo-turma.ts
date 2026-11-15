/** Nome oficial de exibição dos grupos OAS. Códigos de turmas não indicam módulo. */
const GRUPOS_OAS: Record<string, string> = {
  T1: 'OAS 🎭 T1 • Gameleira • 13h–15h',
  T2: 'OAS 🎭 T2 • Gameleira • 10h–12h',
  T3: 'OAS 🎭 T3 • Gameleira • 15h–17h',
  T4: 'OAS 🎭 T4 • Nomads • 14h–16h',
  T5: 'OAS 🎭 T5 • Gameleira • 8h–10h',
};
export function nomeGrupoTurma(codigo: string): string {
  return GRUPOS_OAS[codigo.trim().toUpperCase()] ?? codigo;
}

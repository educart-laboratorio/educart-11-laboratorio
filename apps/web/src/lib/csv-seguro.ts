/**
 * Exportação CSV segura para uso em planilhas: evita interpretação de
 * texto fornecido pelo usuário como fórmula ao abrir no Excel/Calc.
 * A mitigação é aplicada antes da duplicação das aspas CSV.
 */
export function csvCellSeguro(value: unknown): string {
  const raw = String(value ?? '');
  // Incluir espaços, tabulações, quebras de linha e outros controles no início.
  const formula = /^[\s\u0000-\u001f]*[=+@-]/u.test(raw);
  const texto = formula ? "'" + raw : raw;
  return '"' + texto.replace(/"/g, '""') + '"';
}

/**
 * CSV compatível com abertura direta no Excel pt-BR.
 * BOM UTF-8 + diretiva sep=; evita colocar toda a linha na coluna A,
 * mesmo quando o Windows está configurado para separador decimal vírgula.
 * Preserva as aspas e a neutralização de fórmulas do csvCellSeguro.
 */
export function gerarCsvExcel(
  cabecalhos: readonly string[],
  linhas: readonly (readonly unknown[])[],
): string {
  const largura = cabecalhos.length;
  if (!largura || linhas.some(linha => linha.length !== largura)) {
    throw new Error('CSV: número de colunas inconsistente');
  }
  const registro = (campos: readonly unknown[]) => campos.map(csvCellSeguro).join(';');
  return '\uFEFFsep=;\r\n' + [registro(cabecalhos), ...linhas.map(registro)].join('\r\n') + '\r\n';
}

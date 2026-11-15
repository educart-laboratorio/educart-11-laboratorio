const PALETTE = [
  ['#084498', '#ffbc32', '#fa2b35'],
  ['#ffbc32', '#fa2b35', '#ffbc32'],
  ['#fa2b35', '#ffbc32', '#084498'],
] as const;

/**
 * Marca EducART — reconstruída em vetores a partir do material de referência
 * enviado pela direção. Nove pontos nas cores e disposição oficiais.
 *
 * O subtítulo correto é "Núcleo de Formação de Atores": atuação para
 * teatro, cinema e televisão, sem restringir a identidade ao teatro.
 */
export function EducartLogo({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
  const symbolSize = size === 'small' ? 29 : size === 'large' ? 57 : 39;
  const titleSize = size === 'small' ? 20 : size === 'large' ? 37 : 28;
  const subtitleSize = size === 'small' ? 7 : size === 'large' ? 9.7 : 8.1;

  return (
    <div className="educart-brand-block" style={{ display: 'inline-flex', alignItems: 'center', gap: size === 'large' ? 12 : 9, maxWidth: '100%' }}>
      <svg viewBox="0 0 84 84" width={symbolSize} height={symbolSize} aria-hidden="true" focusable="false" style={{ display: 'block', flexShrink: 0 }}>
        {PALETTE.flatMap((row, y) => row.map((fill, x) => (
          <circle key={`${x}-${y}`} cx={13 + x * 29} cy={13 + y * 29} r="10.6" fill={fill} />
        )))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.04, minWidth: 0 }}>
        <strong style={{ fontSize: titleSize, fontWeight: 900, letterSpacing: '-0.048em', color: '#fff', whiteSpace: 'nowrap' }}>
          EducART
        </strong>
        <span style={{ fontSize: subtitleSize, marginTop: 4, letterSpacing: '0.008em', fontWeight: 740, color: '#e6edf8', lineHeight: 1.22, whiteSpace: 'nowrap' }}>
          NÚCLEO DE FORMAÇÃO DE ATORES
        </span>
      </div>
    </div>
  );
}

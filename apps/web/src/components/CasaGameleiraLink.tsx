export const HORARIO_TURMA_FORMACAO = '15h às 17h';
export const NOME_LOCAL_FORMACAO = 'Casa Gameleira';
export const INSTAGRAM_CASA_GAMELEIRA = 'https://www.instagram.com/acasagameleira/';

/** Perfil informado pela coordenação, aberto em nova aba para consulta do local. */
export function CasaGameleiraLink() {
  return (
    <a
      className="educart-link-casa-gameleira"
      href={INSTAGRAM_CASA_GAMELEIRA}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ver a Casa Gameleira no Instagram, perfil @acasagameleira"
    >
      @acasagameleira <span aria-hidden="true">↗</span>
    </a>
  );
}

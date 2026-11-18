'use client';
import { EducartLogo } from '@/components/EducartLogo';

export type Houston95Destino =
  | 'visao' | 'inscricoes' | 'secretaria' | 'estudantes'
  | 'turmas' | 'docentes' | 'agenda' | 'frequencia' | 'financeiro';

const grupos: readonly { grupo: string; itens: readonly { id: Houston95Destino; nome: string }[] }[] = [
  { grupo: 'Painel', itens: [{ id: 'visao', nome: 'Visão geral' }] },
  { grupo: 'Pessoas', itens: [
    { id: 'inscricoes', nome: 'Gestão de inscrições' },
    { id: 'secretaria', nome: 'Secretaria e matrículas' },
    { id: 'estudantes', nome: 'Estudantes e vínculos' },
  ] },
  { grupo: 'Formações', itens: [
    { id: 'turmas', nome: 'Formações e turmas' },
    { id: 'docentes', nome: 'Docentes' },
    { id: 'agenda', nome: 'Agenda' },
    { id: 'frequencia', nome: 'Frequência' },
  ] },
  { grupo: 'Administração', itens: [{ id: 'financeiro', nome: 'Comercial e Financeiro' }] },
];

type Props = {
  ativo: Houston95Destino;
  habilitarFinanceiro: boolean;
  habilitarGestaoInscricoes: boolean;
  navegar: (destino: Houston95Destino) => void;
};

/** Navegação real da Secretaria inspirada na candidata Houston V9.5 PALCO-02.
 * Os componentes existentes continuam responsáveis por ações e permissões reais.
 */
export function AdminHouston95Navegacao({ ativo, habilitarFinanceiro, habilitarGestaoInscricoes, navegar }: Props) {
  return <nav className="houston95-sidebar" aria-label="Secretaria EducART, navegação institucional">
    <div className="houston95-sidehead">
      <EducartLogo size="small" />
      <small>GESTÃO INSTITUCIONAL</small>
    </div>
    <div className="houston95-sidegrid">
      {grupos.map(({ grupo, itens }) => <div className="houston95-sidegroup" key={grupo}>
        <span className="houston95-sidelabel">{grupo}</span>
        {itens.map(({ id, nome }) => {
          const indisponivel = (id === 'financeiro' && !habilitarFinanceiro)
            || (id === 'inscricoes' && !habilitarGestaoInscricoes);
          return <button type="button" key={id}
            className={'houston95-sidebtn ' + (ativo === id ? 'active' : '')}
            aria-current={ativo === id ? 'page' : undefined}
            disabled={indisponivel}
            title={indisponivel ? 'Disponível após homologação deste módulo' : nome}
            onClick={() => navegar(id)}>
            {nome}{indisponivel && <small>· em preparação</small>}
          </button>;
        })}
      </div>)}
    </div>
    <p className="houston95-sidefoot">Houston V9.5 · referência de experiência. Acesso e operações seguem as permissões do sistema.</p>
  </nav>;
}
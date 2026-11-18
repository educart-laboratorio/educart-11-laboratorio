'use client';
import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Houston95Destino } from '@/components/AdminHouston95Navegacao';

type Metrica = 'inscricoes' | 'matriculas' | 'turmas';
type Situacao = Record<Metrica, number | null>;
const vazio: Situacao = { inscricoes: null, matriculas: null, turmas: null };

export function AdminHouston95VisaoDev({
  supabase, navegar,
}: {
  supabase: SupabaseClient;
  navegar: (destino: Houston95Destino) => void;
}) {
  const [valores, setValores] = useState<Situacao>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');
  const atualizar = useCallback(async () => {
    setCarregando(true);
    setAviso('');
    const tabelas = [
      ['inscricoes', 'inscricoes_oficina'],
      ['matriculas', 'matriculas'],
      ['turmas', 'turmas'],
    ] as const;
    const consultas = await Promise.all(tabelas.map(async ([chave, tabela]) => {
      const { count, error } = await supabase.from(tabela).select('id', { head: true, count: 'exact' });
      return { chave, valor: error ? null : count };
    }));
    const numeros: Situacao = { ...vazio };
    for (const { chave, valor } of consultas) numeros[chave] = valor;
    setValores(numeros);
    if (consultas.some(x => x.valor === null)) {
      setAviso('Algumas contagens não puderam ser verificadas com esta sessão. Não foram estimadas.');
    }
    setCarregando(false);
  }, [supabase]);

  useEffect(() => { void atualizar(); }, [atualizar]);

  const indicadores = [
    { chave: 'inscricoes' as const, nome: 'Inscrições cadastradas', detalhe: 'Não equivalem a matrículas' },
    { chave: 'matriculas' as const, nome: 'Matrículas cadastradas', detalhe: 'Não presumir situação ativa' },
    { chave: 'turmas' as const, nome: 'Turmas cadastradas', detalhe: 'Não equivalem a turmas abertas' },
  ];

  return <section className="houston95-overview" aria-labelledby="houston95-overview-titulo">
    <div className="houston95-overview-head">
      <div>
        <span className="houston95-kicker">SECRETARIA · ACESSO AUTENTICADO</span>
        <h1 id="houston95-overview-titulo">Gestão <em>institucional.</em></h1>
        <p>Acompanhamento de inscrições, pessoas, turmas, docência e movimentações, com acesso por papel.</p>
      </div>
      <button type="button" className="houston95-refresh" onClick={() => void atualizar()}
        disabled={carregando}>↻ Atualizar contagens</button>
    </div>
    <div className="houston95-kpis" role="group" aria-label="Contagens dos registros acessíveis">
      {indicadores.map(item => <article className="houston95-kpi" key={item.chave}>
        <span>{item.nome}</span>
        <strong>{valores[item.chave] === null ? '—' : valores[item.chave]}</strong>
        <small>{carregando ? 'Consultando registros...' : valores[item.chave] === null ? 'Não verificado' : item.detalhe}</small>
      </article>)}
    </div>
    {aviso && <p className="houston95-note" role="status">{aviso}</p>}
    <div className="houston95-workspace">
      <div className="houston95-workspace-title"><h2>Áreas de trabalho</h2><span>ACESSO POR PAPÉIS</span></div>
      <p>Escolha uma área para consultar os registros reais e realizar apenas as operações autorizadas.</p>
      <div className="houston95-actions">
        <button type="button" onClick={() => navegar('secretaria')}>Inscrições e matrículas <span aria-hidden="true">›</span></button>
        <button type="button" onClick={() => navegar('turmas')}>Formações e turmas <span aria-hidden="true">›</span></button>
        <button type="button" onClick={() => navegar('docentes')}>Equipe docente <span aria-hidden="true">›</span></button>
        <button type="button" onClick={() => navegar('agenda')}>Agenda e rotina <span aria-hidden="true">›</span></button>
      </div>
      <div className="houston95-pills"><span>Histórico preservado</span><span>Inscrição ≠ matrícula</span><span>Pagamento somente com confirmação</span></div>
    </div>
    <p className="houston95-overview-foot">
      Base visual: Houston V9.5 PALCO-02 · Dados consultados no ambiente Supabase da sessão.
      Contagens não representam pagamentos, recebimentos ou confirmações de oferta.
    </p>
  </section>;
}
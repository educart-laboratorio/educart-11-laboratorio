'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  FORMATOS_EXTRAS, MAX_PARTICIPANTES_CENARIO,
  moedaBRL, simularInvestimentoExtra, type CodigoFormatoExtra,
} from '@/lib/comercial/formatos-extras';

const QUANTIDADE_VALIDA = /^(0|[1-9]\d{0,4})$/;
function interpretarQuantidade(texto: string): number | null {
  if (!QUANTIDADE_VALIDA.test(texto)) return null;
  const valor = Number(texto);
  return valor <= MAX_PARTICIPANTES_CENARIO ? valor : null;
}

/** Planejamento comercial e leitura agregada de propostas docentes, sem escritas no banco. */
export function AdminComercialFinanceiroExtras({supabase}:{supabase:SupabaseClient}) {
  const [propostas,setPropostas] = useState<{total:number;pendentes:number}|null>(null);
  const [carregandoPropostas,setCarregandoPropostas] = useState(false);
  const [erroPropostas,setErroPropostas] = useState('');
  const carregarPropostas = useCallback(async()=>{
    setCarregandoPropostas(true);setErroPropostas('');
    try {
      const [todas,pendentes] = await Promise.all([
        supabase.from('educart_propostas_solucoes_docentes_dev').select('id',{count:'exact',head:true}),
        supabase.from('educart_propostas_solucoes_docentes_dev').select('id',{count:'exact',head:true})
          .eq('estado','pendente_analise'),
      ]);
      if(todas.error||pendentes.error||todas.count===null||pendentes.count===null
        ||pendentes.count>todas.count)throw new Error('Consulta indisponível ou incompleta');
      setPropostas({total:todas.count,pendentes:pendentes.count});
    } catch {
      setPropostas(null);setErroPropostas('Não foi possível consultar as propostas docentes autorizadas no DEV.');
    } finally {setCarregandoPropostas(false);}
  },[supabase]);
  useEffect(()=>{void carregarPropostas();},[carregarPropostas]);
  const [codigo, setCodigo] = useState<CodigoFormatoExtra>('F01');
  const [externos, setExternos] = useState('0');
  const [atores, setAtores] = useState('0');
  const externosNumero = interpretarQuantidade(externos);
  const atoresNumero = interpretarQuantidade(atores);
  const valido = externosNumero !== null && atoresNumero !== null;
  const resultado = useMemo(
    () => valido ? simularInvestimentoExtra(codigo, externosNumero!, atoresNumero!) : null,
    [codigo, externosNumero, atoresNumero, valido],
  );

  return <section aria-labelledby="extras-titulo" className="admin-r11-principal">
    <div className="admin-r11-linha">
      <div>
        <h2 id="extras-titulo">Formações Extras · Planejamento comercial</h2>
        <p className="admin-page-desc">Simule formatos e investimentos de referência sem emitir cobranças ou criar matrículas.</p>
      </div>
    </div>
    <p className="admin-academico-note" role="note">
      Fonte comercial: DC-093, 16/11/2026. Os formatos F01–F06 não são turmas abertas.
      Nenhum valor apresentado significa receita recebida, contrato aprovado ou vaga garantida.
    </p>
    <div aria-label="Prospecção docente no DEV">
      <div className="admin-r11-linha">
        <h3>Prospecção docente · Dados reais do DEV</h3>
        <button className="admin-btn admin-btn-secondary" type="button"
          onClick={()=>void carregarPropostas()} disabled={carregandoPropostas}>↻ Atualizar</button>
      </div>
      {carregandoPropostas&&<p role="status">Consultando propostas docentes...</p>}
      {erroPropostas&&<p role="alert">{erroPropostas}</p>}
      {propostas&&!carregandoPropostas&&<div className="admin-r11-resumo" role="group"
        aria-label="Propostas docentes existentes no DEV">
        <div><small>Propostas docentes registradas</small><strong>{propostas.total}</strong></div>
        <div><small>Aguardando análise</small><strong>{propostas.pendentes}</strong></div>
      </div>}
      <p className="admin-academico-note">
        Propostas de professores não são manifestações de interesse de estudantes.
        Estes contadores não representam inscrições, matrículas, ofertas abertas ou faturamento.
      </p>
    </div>
    <div className="admin-r11-linha"><h3>1. Escolha o formato</h3></div>
    <div className="admin-r11-lista" role="group" aria-label="Formatos comerciais F01 a F06">
      {FORMATOS_EXTRAS.map(formato => <button
        key={formato.codigo} type="button"
        className={'admin-btn ' + (codigo === formato.codigo ? 'admin-btn-primary' : 'admin-btn-secondary')}
        aria-pressed={codigo === formato.codigo} onClick={() => setCodigo(formato.codigo)}>
        <strong>{formato.codigo}</strong> · {formato.encontros} encontro(s) × {formato.horasPorEncontro}h
        <span style={{display:'block'}}>Externo {moedaBRL(formato.externoCentavos)} · Ator EducART {moedaBRL(formato.atorEducartCentavos)}</span>
      </button>)}
    </div>
    <div className="admin-r11-linha"><h3>2. Simule a procura hipotética</h3></div>
    <div className="admin-r11-linha" style={{gap:16,flexWrap:'wrap'}}>
      <label className="admin-academico-label" htmlFor="extras-externos">
        Público externo (pessoas)
        <input id="extras-externos" type="number" inputMode="numeric" min="0" max={MAX_PARTICIPANTES_CENARIO}
          step="1" className="admin-academico-input" value={externos} onChange={e => setExternos(e.target.value)}/>
      </label>
      <label className="admin-academico-label" htmlFor="extras-atores">
        Ator EducART (pessoas, condição ainda não verificada)
        <input id="extras-atores" type="number" inputMode="numeric" min="0" max={MAX_PARTICIPANTES_CENARIO}
          step="1" className="admin-academico-input" value={atores} onChange={e => setAtores(e.target.value)}/>
      </label>
    </div>
    {!valido && <p role="alert">Informe quantidades inteiras entre 0 e 10.000 em cada campo.</p>}
    {resultado && <div className="admin-r11-resumo" role="status" aria-live="polite">
      <div><small>Formato e duração</small><strong>{resultado.formato.codigo} · {resultado.horasTotais}h</strong></div>
      <div><small>Pessoas no cenário</small><strong>{resultado.totalPessoas}</strong></div>
      <div><small>Potencial bruto hipotético</small><strong>{moedaBRL(resultado.potencialBrutoCentavos)}</strong></div>
    </div>}
    {resultado && <p className="admin-academico-note">
      Composição do cenário: externos {moedaBRL(resultado.investimentoExternoCentavos)};
      Ator EducART {moedaBRL(resultado.investimentoAtorCentavos)}.
      Não são receitas, reservas, dívidas, margens nem projeção de lucro.
    </p>}
    <h3>3. Condições antes de operar</h3>
    <p className="admin-page-desc">
      O benefício Ator EducART exige matrícula regular no curso principal de dois anos e verificação antes da contratação.
      Formações adicionais em planejamento não estão abertas para inscrição ou contratação. Somente uma formação
      aprovada, com docente, ementa e condições verificadas, poderá avançar para a etapa comercial autorizada.
      Este simulador não cria cadastros, não recolhe manifestações de interesse, não registra receitas, não concede
      descontos e não interfere nas 24 mensalidades do R11.
    </p>
    <p className="admin-academico-footer">Simulador de planejamento · DC-093 · sem persistência ou cobrança</p>
  </section>;
}
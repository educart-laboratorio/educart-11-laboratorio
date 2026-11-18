'use client';
/** Financeiro integrado: mensalidades R11 preservadas e planejamento independente de formações extras. */
import { useCallback, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AdminFinanceiroEssencialR11Dev } from '@/components/AdminFinanceiroEssencialR11Dev';
import { AdminComercialFinanceiroExtras } from '@/components/AdminComercialFinanceiroExtras';
type Props={supabase:SupabaseClient;podeGerir:boolean;onRascunhoPendenteChange?:(pendente:boolean)=>void};
export function AdminFinanceiroDev({supabase,podeGerir,onRascunhoPendenteChange}:Props){
  const [frente,setFrente]=useState<'principal'|'extras'>('principal');
  const [rascunhoPendente,setRascunhoPendente]=useState(false);
  const aoRascunho=useCallback((pendente:boolean)=>{
    setRascunhoPendente(pendente);
    onRascunhoPendenteChange?.(pendente);
  },[onRascunhoPendenteChange]);
  const mudarFrente=(destino:typeof frente)=>{
    if(destino===frente)return;
    if(rascunhoPendente&&!window.confirm('Descartar alterações financeiras não salvas?'))return;
    setFrente(destino);
  };
  if(!podeGerir)return <p role="alert">Acesso restrito à gestão financeira autorizada.</p>;
  return <>
    <nav className="admin-r11-abas" aria-label="Frentes de gestão financeira">
      <div className="admin-r11-aba"><button type="button" className={frente==='principal'?'active':''}
        aria-current={frente==='principal'?'page':undefined} onClick={()=>mudarFrente('principal')}>Formação principal · 24 mensalidades</button></div>
      <div className="admin-r11-aba"><button type="button" className={frente==='extras'?'active':''}
        aria-current={frente==='extras'?'page':undefined} onClick={()=>mudarFrente('extras')}>Formações Extras · Planejamento</button></div>
    </nav>
    {frente==='principal' && <AdminFinanceiroEssencialR11Dev supabase={supabase} podeGerir={podeGerir}
      onRascunhoPendenteChange={aoRascunho}/>}
    {frente==='extras' && <AdminComercialFinanceiroExtras/>}
  </>;
}

'use client';
/** Financeiro único R11: três funções, sem montar formulários legados concorrentes. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { AdminFinanceiroEssencialR11Dev } from '@/components/AdminFinanceiroEssencialR11Dev';
type Props={supabase:SupabaseClient;podeGerir:boolean;onRascunhoPendenteChange?:(pendente:boolean)=>void};
export function AdminFinanceiroDev({supabase,podeGerir,onRascunhoPendenteChange}:Props){
  return <AdminFinanceiroEssencialR11Dev supabase={supabase} podeGerir={podeGerir} onRascunhoPendenteChange={onRascunhoPendenteChange}/>;
}

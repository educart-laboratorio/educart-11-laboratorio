'use client';
/** Janela modal nativa: foco, Escape e rolagem interna. Só renderizada pelo admin autenticado. */
import {useEffect,useRef, type ReactNode} from 'react';

type Props={titulo:string;descricao?:string;onClose:()=>void;children:ReactNode;amplo?:boolean;cadastro?:boolean};
export function AdminRegistroModalDev({titulo,descricao,onClose,children,amplo=false,cadastro=false}:Props){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const dialog=ref.current;
  if(!dialog)return;
  // O evento nativo "close" disparado pela limpeza pode chegar após remontagem em StrictMode.
  // Escape e botão Fechar já solicitam fechamento pelo estado React; não ouvir onClose no <dialog>.
  if(!dialog.open)dialog.showModal();
  return()=>{if(dialog.open)dialog.close();};
 },[]);
 return <dialog ref={ref} className={'admin-registro-dialog'+(amplo?' admin-registro-dialog-wide':'')+(cadastro?' admin-registro-dialog-cadastro':'')}
  aria-label={titulo} aria-modal="true" onCancel={e=>{e.preventDefault();onClose();}}>
  <header className="admin-registro-dialog-header">
   <div><h2>{titulo}</h2>{descricao&&<p>{descricao}</p>}</div>
   <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose} aria-label={'Fechar '+titulo}>✕ Fechar</button>
  </header>
  <div className="admin-registro-dialog-body">{children}</div>
 </dialog>;
}

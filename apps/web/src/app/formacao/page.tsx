'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { EducartLogo } from '@/components/EducartLogo';
import { CasaGameleiraLink, HORARIO_TURMA_FORMACAO, NOME_LOCAL_FORMACAO } from '@/components/CasaGameleiraLink';
import { FAIXA_ATE_13 } from '@/lib/idade-formacao';
import { mensagemInformacoesFormacao } from '@/lib/mensagens-whatsapp';
import '../entrada.css';

const whatsapp = 'https://wa.me/5571996824505?text=' + encodeURIComponent(mensagemInformacoesFormacao());
const insights: Record<string,string> = {
  'Atuação profissional':'Interpretação, prática de palco e câmera para quem deseja seguir uma trajetória artística.',
  'Oratória e comunicação':'Expressão, presença e comunicação para além do palco.',
  'Desinibição e confiança':'Um espaço de prática para ganhar desenvoltura e confiança.',
  'Arte e descoberta':'Encontros, criação coletiva e novas possibilidades de expressão.',
};
export default function FormacaoPage() {
  const [interesse,setInteresse] = useState('');
  const [href,setHref] = useState('/inscricao');
  const [detalhe,setDetalhe] = useState<'formacao'|'expressao'|null>(null);
  const detalheRef = useRef<HTMLDialogElement>(null);
  const [faixaSelecionada,setFaixaSelecionada] = useState<string | null>(null);
  const [triagemPronta,setTriagemPronta] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setFaixaSelecionada(q.get('faixa'));
    setTriagemPronta(true);
    const valor = q.get('objetivo') || '';
    setInteresse(valor);
    const qs = new URLSearchParams();
    for (const campo of ['objetivo','faixa','experiencia']) {
      const v=q.get(campo);
      if (v) qs.set(campo,v.slice(0,120));
    }
    setHref('/inscricao' + (qs.toString() ? '?' + qs.toString() : ''));
  },[]);
  useEffect(()=>{
    const janela=detalheRef.current;
    if(!janela)return;
    if(detalhe&&!janela.open)janela.showModal();
    if(!detalhe&&janela.open)janela.close();
  },[detalhe]);
  return <div className="eg-catalog" data-catalog-detail-open={detalhe ? 'true' : 'false'}>
    <header className="eg-catalog-bar">
      <Link className="eg-brand-link" href="/" aria-label="EducART Núcleo de Formação de Atores — voltar ao início"><EducartLogo size="default"/></Link>
      <Link className="eg-return" href="/">← Início</Link>
    </header>
    <div className="eg-catalog-body">
      <section className="eg-catalog-lead">
        <span className="eg-eyebrow">EducART · Soluções de formação</span>
        <h1>Encontre seu próximo movimento.</h1>
        <p>Uma vitrine de experiências para quem quer atuar, falar melhor, se expressar ou descobrir algo novo. Escolha uma solução e conheça seu caminho.</p>
      </section>
      {triagemPronta && faixaSelecionada === FAIXA_ATE_13 && <section className="eg-catalog-lead" role="status" aria-live="polite">
        <h2>Turma adulta: a partir dos 14 anos</h2>
        <p>A Formação de Atores disponível atualmente exige 14 anos completos. Para a faixa de até 13 anos, não há inscrição disponível nesta turma.</p>
        <p>Você pode acompanhar o portal para conhecer futuras ofertas, sem promessa de abertura de uma turma infantil.</p>
        <Link className="eg-button eg-secondary" href="/">← Voltar ao início</Link>
      </section>}
      {triagemPronta && faixaSelecionada !== FAIXA_ATE_13 && <>
      {interesse && <p className="eg-recommended"><strong>Para seu interesse em {interesse.toLocaleLowerCase('pt-BR')}:</strong> {insights[interesse] || 'conheça nossas experiências de formação.'}</p>}
      <section aria-label="Soluções disponíveis">
        <div className="eg-shelf-head"><h2>Escolha sua formação</h2><span>1 formação com inscrições · 1 atividade exclusiva · deslize para explorar</span></div>
        <div className="eg-shelf" role="region" aria-label="Carrossel de soluções de formação" tabIndex={0}>
          <article className="eg-course" aria-labelledby="oficina-titulo">
            <button type="button" className="eg-course-open"
              aria-label="Conhecer a Formação de Atores"
              onClick={()=>setDetalhe('formacao')}/>
            <div className="eg-cover" role="img" aria-label="Fotografia de atividades dos alunos da Oficina de Atores Salvador"/>
            <div className="eg-course-info">
              <div className="eg-course-heading">
                <img className="eg-oficina-logo" src="/images/oficina-atores-simbolo.svg" width="62" height="62" alt="Marca da Oficina de Atores Salvador"/>
                <div><small>OFICINA DE ATORES SALVADOR</small><strong id="oficina-titulo">Formação de Atores</strong></div>
              </div>
              <p>Dois anos de formação para atuar no teatro, no cinema e na televisão, com interpretação, expressão e criação coletiva. Experiências para sua vida — dentro e fora de cena.</p>
              <div className="eg-tags"><span>Turma adulta · a partir de 14 anos</span><span>2 anos</span><span>Presencial · Salvador</span><span>Teatro · Cinema · TV</span></div>
              <div className="educart-turma-local" aria-label="Horário e local da formação">
                <span><strong>Horário das aulas:</strong> {HORARIO_TURMA_FORMACAO}</span>
                <span><strong>Local:</strong> {NOME_LOCAL_FORMACAO} · <CasaGameleiraLink /></span>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'9px'}}>
                <Link className="eg-button" href={href}>Quero me inscrever →</Link>
                <button className="eg-button eg-secondary" type="button" onClick={()=>setDetalhe('formacao')}>Conhecer</button>
              </div>

            </div>
          </article>
          {/* Prévia DEV: imagem de referência recortada do Instagram, não é o original; sem autorização de publicação definitiva. Não consultar ficha privada do docente. */}
          <article className="eg-course eg-course-unavailable" aria-labelledby="expressao-corporal-titulo">
            <button type="button" className="eg-course-open"
              aria-label="Conhecer a atividade Interpretação e Expressão Corporal"
              onClick={()=>setDetalhe('expressao')}/>
            <div className="eg-cover eg-cover-poster">
              <img src="/images/fernando-santana-cartaz-referencia-dev.png" width="709" height="990"
                alt="Cartaz: Novembro na Oficina, Interpretação e Expressão Corporal com Fernando Santana, com sua fotografia e as marcas oficiais da Oficina de Atores Salvador e EducART"
                loading="lazy" decoding="async"/>
            </div>
            <div className="eg-course-info">
              <div className="eg-course-heading">
                <img className="eg-oficina-logo" src="/images/oficina-atores-simbolo.svg" width="62" height="62" alt="Marca da Oficina de Atores Salvador"/>
                <div><small>OFICINA DE ATORES SALVADOR · ATIVIDADE EXCLUSIVA DO CURSO LIVRE</small><strong id="expressao-corporal-titulo">Interpretação e Expressão Corporal</strong></div>
              </div>
              <div className="eg-tags"><span className="eg-unavailable-tag">Indisponível</span><span>Atividade do Curso Livre de Teatro</span></div>
              <p><strong>Com Fernando Santana.</strong> Esta oficina foi divulgada como atividade exclusiva dos estudantes do Curso Livre de Teatro.</p>
              <p>Inscrições avulsas indisponíveis. Não há reservas de vagas ou compras disponíveis para esta oficina.</p>
              <button className="eg-button eg-secondary" type="button"
                onClick={()=>setDetalhe('expressao')}>Conhecer</button>
            </div>
          </article>
        </div>
        <p className="eg-nextline">A Formação de Atores mantém suas inscrições. A oficina de Interpretação e Expressão Corporal está indisponível para inscrições avulsas.</p>
      </section>
      </>}
    </div>
    <dialog ref={detalheRef} className="eg-conhecer-dialog"
      aria-labelledby="eg-conhecer-titulo"
      onCancel={e=>{e.preventDefault();setDetalhe(null);}}>
      <header className="eg-conhecer-header">
        <span className="eg-eyebrow">EducART · Conhecer</span>
        <button type="button" className="eg-conhecer-fechar"
          onClick={()=>setDetalhe(null)} aria-label="Fechar detalhes da formação">✕ Fechar</button>
      </header>
      {detalhe==='formacao'&&<div className="eg-conhecer-conteudo">
        <h2 id="eg-conhecer-titulo">Formação de Atores</h2>
        <p>Dois anos de formação para atuar no teatro, no cinema e na televisão, com interpretação, expressão e criação coletiva. Experiências para sua vida — dentro e fora de cena.</p>
        <p><strong>O que você desenvolve:</strong> interpretação, improvisação, expressão corporal e vocal, consciência cênica, oratória e experiência diante da câmera.</p>
        <p><strong>Idade mínima:</strong> 14 anos. <strong>Modalidade:</strong> presencial, em Salvador.</p>
        <p><strong>Horário das aulas:</strong> {HORARIO_TURMA_FORMACAO}</p>
        <p><strong>Local:</strong> {NOME_LOCAL_FORMACAO} · <CasaGameleiraLink /></p>
        <p><strong>Coordenação:</strong> Aline Nepomuceno. <strong>Investimento de referência:</strong> matrícula de R$ 50 e mensalidade de R$ 320. Datas, vagas e condições devem ser confirmadas com a escola.</p>
        <div className="eg-conhecer-acoes">
          <Link className="eg-button" href={href}>Quero me inscrever →</Link>
          <a className="eg-button eg-secondary" href={whatsapp}
            target="_blank" rel="noopener noreferrer">Falar com a coordenação ↗</a>
        </div>
      </div>}
      {detalhe==='expressao'&&<div className="eg-conhecer-conteudo">
        <h2 id="eg-conhecer-titulo">Interpretação e Expressão Corporal</h2>
        <p><strong>Com Fernando Santana.</strong> Atividade exclusiva dos estudantes do Curso Livre de Teatro da Oficina de Atores Salvador.</p>
        <figure className="eg-conhecer-cartaz">
          <img src="/images/fernando-santana-cartaz-referencia-dev.png"
            alt="Cartaz de referência da atividade Interpretação e Expressão Corporal" width="709" height="990" loading="lazy"/>
        </figure>
        <p className="eg-conhecer-indisponivel">Indisponível para inscrições avulsas. Não há reservas de vagas ou compras disponíveis para esta oficina.</p>
      </div>}
    </dialog>
  </div>;
}

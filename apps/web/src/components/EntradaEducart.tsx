'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EducartLogo } from '@/components/EducartLogo';
import { FAIXA_ATE_13 } from '@/lib/idade-formacao';

type Etapa = 'abertura' | 'interesses' | 'objetivo' | 'idade' | 'idade-indisponivel' | 'experiencia';
const objetivos = [
  { valor: 'Atuação profissional', descricao: 'Quero estudar interpretação e construir uma trajetória artística.' },
  { valor: 'Oratória e comunicação', descricao: 'Quero me expressar melhor em público e no trabalho.' },
  { valor: 'Desinibição e confiança', descricao: 'Quero perder o medo e desenvolver minha presença.' },
  { valor: 'Arte e descoberta', descricao: 'Quero experimentar, conhecer pessoas e ampliar meu repertório.' },
];
const faixas = ['Até 13 anos', '14 a 17 anos', '18 a 29 anos', '30 a 49 anos', '50 anos ou mais'];
const experiencias = ['Estou começando', 'Já participei de aulas ou oficinas', 'Já tenho experiência em cena'];
const areas = [
  { nome: 'Formação', descricao: 'Cursos, oficinas e experiências', ativa: true },
  { nome: 'Espetáculos', descricao: 'Programação cultural', ativa: false },
  { nome: 'Radar Cultural', descricao: 'Agenda e oportunidades', ativa: false },
  { nome: 'Agência EducART', descricao: 'Conexões profissionais', ativa: false },
  { nome: 'Fórum EducART', descricao: 'Comunidade e trocas', ativa: false },
  { nome: 'Festival EducART', descricao: 'Inscrições e programação', ativa: false },
];
export function EntradaEducart() {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>('abertura');
  const [objetivo, setObjetivo] = useState('');
  const [idade, setIdade] = useState('');
  const voltar = () => {
    const anterior: Record<Etapa, Etapa> = { abertura:'abertura', interesses:'abertura', objetivo:'interesses', idade:'objetivo', 'idade-indisponivel':'idade', experiencia:'idade' };
    setEtapa(anterior[etapa]);
  };
  const finalizar = (resposta: string) => {
    const qs = new URLSearchParams({ objetivo, faixa: idade, experiencia: resposta });
    router.push('/formacao?' + qs.toString());
  };
  return (
    <div className="eg-root">
      <div className="eg-backdrop" aria-hidden="true" />
      <div className="eg-stage" id="inicio" data-educart-etapa={etapa}>
        {etapa !== 'abertura' && <div className="eg-top"><button type="button" className="eg-plain" onClick={voltar}>← Voltar</button><span className="eg-mini">EDUCART · PORTAL CULTURAL</span></div>}
        {etapa === 'abertura' && <section className="eg-opening" aria-label="Bem-vindo à EducART">
          <button className="eg-start" onClick={() => setEtapa('interesses')} type="button" aria-label="EducART Núcleo de Formação de Atores — começar">
            <div className="eg-halo"><div className="eg-logo"><EducartLogo size="large" /></div></div>
          </button>
          <p className="eg-kicker">UM UNIVERSO DE POSSIBILIDADES</p>
          <h1>Seu lugar na arte começa aqui.</h1>
          <button className="eg-tap" type="button" onClick={() => setEtapa('interesses')}>Toque para começar <span aria-hidden="true">→</span></button>
        </section>}
        {etapa === 'interesses' && <section className="eg-dialog" aria-labelledby="etapa-titulo">
          <span className="eg-counter">01 / 04 · DESCUBRA</span>
          <h1 id="etapa-titulo">O que você deseja encontrar?</h1>
          <p>Escolha um caminho. Os demais ambientes chegarão em breve.</p>
          <div className="eg-areas">{areas.map(a => <button type="button" key={a.nome} disabled={!a.ativa} className={'eg-area ' + (a.ativa ? 'eg-area-on':'eg-area-off')} onClick={() => setEtapa('objetivo')}>
            <span><strong>{a.nome}</strong><small>{a.descricao}</small></span><em>{a.ativa ? 'Explorar →':'Em breve'}</em>
          </button>)}</div>
        </section>}
        {etapa === 'objetivo' && <section className="eg-dialog" aria-labelledby="etapa-titulo">
          <span className="eg-counter">02 / 04 · SEU INTERESSE</span>
          <h1 id="etapa-titulo">O que você quer desenvolver?</h1>
          <p>Não existe resposta errada. A atuação pode abrir muitos caminhos — no palco, no cinema e na TV.</p>
          <div className="eg-options">{objetivos.map(o => <button key={o.valor} type="button" className="eg-choice" onClick={() => {setObjetivo(o.valor);setEtapa('idade')}}><strong>{o.valor}</strong><small>{o.descricao}</small><span aria-hidden="true">↗</span></button>)}</div>
        </section>}
        {etapa === 'idade' && <section className="eg-dialog" aria-labelledby="etapa-titulo">
          <span className="eg-counter">03 / 04 · SEU MOMENTO</span>
          <h1 id="etapa-titulo">Qual é sua faixa etária?</h1>
          <p>Isso nos ajuda a orientar você sobre as turmas e atividades.</p>
          <div className="eg-options">{faixas.map(x => <button className="eg-choice" type="button" key={x} onClick={() => {setIdade(x);setEtapa(x === FAIXA_ATE_13 ? 'idade-indisponivel' : 'experiencia')}}><strong>{x}</strong><span aria-hidden="true">↗</span></button>)}</div>
        </section>}
        {etapa === 'idade-indisponivel' && <section className="eg-dialog" aria-labelledby="etapa-titulo">
          <span className="eg-counter">03 / 04 · FAIXA ETÁRIA</span>
          <h1 id="etapa-titulo">Esta turma é a partir dos 14 anos.</h1>
          <p>A turma adulta da Oficina de Atores Salvador recebe participantes com 14 anos completos ou mais.</p>
          <p>Para quem tem até 13 anos, esta formação não está disponível para inscrição neste momento. Nenhuma outra turma está sendo anunciada para essa faixa etária.</p>
          <button type="button" className="eg-choice" onClick={() => setEtapa('idade')}><strong>← Voltar às faixas etárias</strong></button>
        </section>}
        {etapa === 'experiencia' && <section className="eg-dialog" aria-labelledby="etapa-titulo">
          <span className="eg-counter">04 / 04 · SUA TRAJETÓRIA</span>
          <h1 id="etapa-titulo">Você já teve contato com a atuação?</h1>
          <p>Vamos encontrar a melhor porta de entrada para você.</p>
          <div className="eg-options">{experiencias.map(x => <button className="eg-choice" type="button" key={x} onClick={() => finalizar(x)}><strong>{x}</strong><span aria-hidden="true">↗</span></button>)}</div>
        </section>}
        {etapa !== 'abertura' && <div className="eg-progress" aria-hidden="true"><span style={{width:({interesses:'25%',objetivo:'50%',idade:'75%','idade-indisponivel':'75%',experiencia:'100%'} as Record<string,string>)[etapa]}}/></div>}
      </div>
      <footer className="eg-foot">EducART · Portal Cultural <span>Salvador, Bahia</span></footer>
    </div>
  );
}

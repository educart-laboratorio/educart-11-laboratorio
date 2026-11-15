'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { EducartLogo } from '@/components/EducartLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import './niveis-demo.css';

type Tier = {
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  benefits: string[];
  future: string[];
  accent: string;
  icon: string;
};

const tiers: Tier[] = [
  {
    slug: 'iniciante',
    name: 'Perfil Iniciante',
    subtitle: 'Sua identidade artística começa aqui.',
    description: 'Ativado após a matrícula aprovada e a confirmação do pagamento da primeira mensalidade da formação. Incluído enquanto durar o curso; depois, pode manter por R$ 10/mês.',
    benefits: ['Perfil artístico individual', 'Até 3 fotos (quando o envio for liberado)', 'Nome artístico, bio e características', 'Histórico das formações EducART'],
    future: ['Portfólio compartilhável, mediante autorização'],
    accent: '#f4bc5a',
    icon: '01',
  },
  {
    slug: 'intermediario',
    name: 'Perfil Intermediário',
    subtitle: 'Mais espaço para contar sua trajetória.',
    description: 'R$ 15/mês pagos pelo artista. Pode ser contratado diretamente, sem cursar ou assinar um nível anterior.',
    benefits: ['Tudo do Iniciante', 'Currículo e experiências ampliados', 'Destaque de participações e projetos', 'Ferramentas adicionais de organização'],
    future: ['Alertas e acompanhamento de oportunidades'],
    accent: '#4f9bff',
    icon: '02',
  },
  {
    slug: 'avancado',
    name: 'Perfil Avançado',
    subtitle: 'Um portfólio com mais possibilidades.',
    description: 'R$ 20/mês pagos pelo artista. Acesso direto, sem exigir passagem pelo Intermediário ou conclusão de semestre.',
    benefits: ['Tudo do Intermediário', 'Portfólio artístico ampliado', 'Apresentação profissional aprimorada', 'Possibilidade de candidatura à Agência'],
    future: ['Até 2 vídeos, quando houver plano elegível e liberação técnica'],
    accent: '#f52b35',
    icon: '03',
  },
  {
    slug: 'pro',
    name: 'Perfil Pró',
    subtitle: 'Recursos profissionais mediante aprovação.',
    description: 'R$ 25/mês. Você pode solicitar o Pró desde o primeiro dia, mas a liberação depende de aprovação em critérios de elegibilidade.',
    benefits: ['Tudo do Avançado', 'Ferramentas de apresentação profissional', 'Recursos Pró liberados após aprovação', 'Candidatura à Agência, com avaliação independente'],
    future: ['Vídeos e outros recursos somente após habilitação', 'Credenciamento e contratações não são garantidos pela assinatura'],
    accent: '#f4bc5a',
    icon: '04',
  },
];

const features = [
  ['Perfil individual', '✓', '✓', '✓', '✓'],
  ['Fotos (até 3)', 'Previsto', 'Previsto', 'Previsto', 'Previsto'],
  ['Currículo artístico', 'Básico', 'Expandido', 'Completo', 'Completo'],
  ['Histórico das formações', '✓', '✓', '✓', '✓'],
  ['Vídeos (até 2)', 'Bloqueado', 'Bloqueado', 'Futuro', 'Futuro'],
  ['Credenciamento na Agência', 'Análise separada', 'Análise separada', 'Análise separada', 'Análise separada'],
];

export default function NiveisDemoPage() {
  const [selected, setSelected] = useState(0);
  const tier = tiers[selected];
  return (
    <div className="lv-page">
      <header className="lv-header">
        <div className="lv-container lv-header-inner">
          <EducartLogo size="default" />
          <div className="lv-actions">
            <Link href="/" className="lv-back-home" aria-label="Voltar ao menu principal da EducART">← Menu</Link>
            <span className="lv-preview">AutoDEV · conceito</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="lv-container">
        <section className="lv-hero">
          <span className="lv-eyebrow"><span className="lv-eyebrow-dot" /> A JORNADA DO ARTISTA</span>
          <h1>Todo talento tem <em>um próximo nível.</em></h1>
          <p>Após a matrícula aprovada e a confirmação do pagamento da primeira mensalidade da formação, seu Perfil Iniciante é ativado e fica incluído durante o curso. Ao terminar, você pode mantê-lo por R$ 10/mês ou evoluir para outros perfis. Intermediário e Avançado têm acesso direto; Pró exige aprovação.</p>
          <div className="lv-colorbar" aria-hidden="true"><i/><i/><i/></div>
        </section>

        <aside className="lv-notice" role="note">
          <strong>Prévia de produto — sem cobranças habilitadas.</strong> O Perfil Iniciante custa R$ 10/mês, mas está incluído durante os meses de formação após a confirmação do primeiro pagamento da mensalidade do curso. Na formação de dois anos, o Perfil Iniciante permanece incluído durante o curso; depois você decide se deseja mantê-lo por R$ 10/mês. Nenhuma renovação é automática nesta prévia.
        </aside>

        <section className="lv-lifecycle" aria-label="Do curso à continuidade do seu perfil">
          <div><strong>01 · PRIMEIRA MENSALIDADE</strong><span>Após a matrícula aprovada e o pagamento confirmado, o Perfil Iniciante é ativado.</span></div>
          <div><strong>02 · DURANTE O CURSO</strong><span>Perfil incluído por toda a duração da formação.</span></div>
          <div><strong>03 · APÓS O CURSO</strong><span>Você escolhe: mantém por R$ 10/mês ou faz upgrade.</span></div>
        </section>

        <section className="lv-section" aria-labelledby="lv-title">
          <div className="lv-section-head">
            <div>
              <span className="lv-overline">QUATRO PERFIS DE ATOR · UMA TRAJETÓRIA</span>
              <h2 id="lv-title">Escolha um nível para explorar</h2>
            </div>
            <span className="lv-legend">Prévia interativa · perfis de ator</span>
          </div>

          <div className="lv-tier-grid">
            {tiers.map((item, index) => (
              <button
                key={item.slug}
                type="button"
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
                className={'lv-tier-card' + (selected === index ? ' lv-tier-selected' : '')}
                style={{'--lv-accent': item.accent} as CSSProperties}
              >
                <span className="lv-tier-top">
                  <span className="lv-tier-number">{item.icon}</span>
                  <span className="lv-tier-tag">{index === 0 ? 'INCLUÍDO NA FORMAÇÃO' : index === 3 ? 'SOB APROVAÇÃO' : 'ACESSO DIRETO'}</span>
                </span>
                <span className="lv-tier-name">{item.name}</span>
                <span className="lv-tier-sub">{item.subtitle}</span>
                <span className="lv-tier-price">{'R$ ' + [10,15,20,25][index]}<small>{index === 0 ? '/ mês · incluído durante o curso' : index === 3 ? '/ mês · sujeito à aprovação' : '/ mês · contratação futura'}</small></span>
                <span className="lv-tier-more">{selected === index ? 'Nível selecionado' : 'Explorar recursos'} <span aria-hidden="true">↗</span></span>
              </button>
            ))}
          </div>
          <div className="lv-progression" aria-label="Iniciante, Intermediário, Avançado, Pró">
            {tiers.map((item,index) => <span key={item.slug} className={index<=selected?'lv-on':''}/>)}
          </div>

          <div className="lv-detail" style={{'--lv-accent':tier.accent} as CSSProperties}>
            <div className="lv-detail-main">
              <span className="lv-overline">DETALHES DO NÍVEL {String(selected+1).padStart(2,'0')}</span>
              <h3>{tier.name}</h3>
              <p>{tier.description}</p>
              <div className="lv-detail-list">
                {tier.benefits.map(item => (
                  <div className="lv-benefit" key={item}><span aria-hidden="true">✓</span><span>{item}</span></div>
                ))}
              </div>
            </div>
            <div className="lv-future">
              <span className="lv-lock" aria-hidden="true">⌁</span>
              <h4>O que vem depois?</h4>
              {tier.future.map(item => <p key={item}>{item}</p>)}
              <div className="lv-future-foot">Vídeos permanecem bloqueados em todos os níveis até serem lançados.</div>
            </div>
          </div>
        </section>

        <section className="lv-section" aria-labelledby="lv-resources-title">
          <div className="lv-section-head">
            <div><span className="lv-overline">RECURSOS PROPOSTOS</span><h2 id="lv-resources-title">Uma matriz que cresce com você</h2></div>
          </div>
          <div className="lv-matrix-scroller">
            <table className="lv-matrix">
              <thead><tr><th scope="col">Recurso</th>{tiers.map(item=><th key={item.slug} scope="col">{item.name.replace('Perfil ','')}</th>)}</tr></thead>
              <tbody>{features.map(row=><tr key={row[0]}>{row.map((cell,i)=>i===0?<th scope="row" key={i}>{cell}</th>:<td key={i}>{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <p className="lv-fineprint">Intermediário e Avançado podem ser contratados sem passar pelos perfis anteriores. O Pró pode ser solicitado diretamente, mas depende de aprovação. Estes perfis são serviços digitais, não níveis acadêmicos. Recursos previstos ainda dependem de implementação; nenhuma assinatura garante trabalhos ou escalações.</p>
        </section>

        <section className="lv-agency" aria-label="Modelo de intermediação da Agência EducART">
          <div>
            <span className="lv-overline">AGÊNCIA EDUCART · OPORTUNIDADES</span>
            <h2>10% somente quando a Agência intermediar uma contratação.</h2>
            <p>A comissão proposta pela EducART é de 10% sobre o cachê artístico efetivamente recebido em trabalhos intermediados pela Agência, conforme contrato. Trabalhos encontrados sem nossa intermediação não geram comissão.</p>
            <small>O acesso às oportunidades públicas não depende do plano Pró. Credenciamento, seleção e contratação são processos independentes da assinatura.</small>
          </div>
          <div className="lv-agency-mark" aria-hidden="true"><strong>10<span>%</span></strong><span>COMISSÃO SOCIAL</span></div>
        </section>

        <div className="lv-bottom">
          <div>
            <span className="lv-overline">PREÇOS MENSAIS DOS PERFIS · SEM COBRANÇA ATIVA</span>
            <p>Perfil Iniciante R$ 10 · Intermediário R$ 15 · Avançado R$ 20 · Pró R$ 25</p>
            <small>Seu Iniciante é ativado após o primeiro pagamento confirmado da formação, sem cobrança extra pelo perfil durante o curso. Depois, o acesso por assinatura depende de sua escolha; não há renovação nem cobrança automática. O Pró exige aprovação.</small>
          </div>
          <Link href="/matricula-demo" className="lv-back">Conhecer o perfil inicial <span aria-hidden="true">↗</span></Link>
        </div>
        <footer className="lv-footer"><span>EducART · Formação, arte e oportunidades.</span><span>Conceito AutoDEV · sem impacto na produção</span></footer>
      </main>
    </div>
  );
}

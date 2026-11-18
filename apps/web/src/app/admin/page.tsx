'use client';
import { AdminAjuda } from '@/components/AdminAjuda';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EducartLogo } from '@/components/EducartLogo';
import { AdminRotinaAcademicaLab } from '@/components/AdminRotinaAcademicaLab';
import { AdminIngressosSimplesDev } from '@/components/AdminIngressosSimplesDev';
import { AdminRegistroModalDev } from '@/components/AdminRegistroModalDev';
import { AdminGestaoInscricoesDev } from '@/components/AdminGestaoInscricoesDev';
import {AdminIndicadoresInscricoesDev} from '@/components/AdminIndicadoresInscricoesDev';
import { AdminFinanceiroDev } from '@/components/AdminFinanceiroDev';
import { AdminHouston95Navegacao } from '@/components/AdminHouston95Navegacao';
import { AdminHouston95VisaoDev } from '@/components/AdminHouston95VisaoDev';
import { AdminClientesDev } from '@/components/AdminClientesDev';
import { AdminMatriculaUnificadaDev } from '@/components/AdminMatriculaUnificadaDev';

import { AdminAtendimentoR12Dev } from '@/components/AdminAtendimentoR12Dev';
import { AdminIntegridadeMatriculasR12Dev } from '@/components/AdminIntegridadeMatriculasR12Dev';
import { ACOES_ACADEMICAS_EXCLUSIVAS_DEV, createClient } from '@/lib/supabase/client';
import { obterPapeisGestao, type PapelGestao } from '@/lib/admin/autorizar-gestao';
import { linkPrimeiroContatoSecretaria } from '@/lib/atendimento/whatsapp-equipe-dev';
import { classificarCampanha, NOME_GRUPO_CAMPANHA, type FiltroCampanha } from '@/lib/campanhas';
import { gerarCsvExcel } from '@/lib/csv-seguro';

export interface Inscricao {
  id: string;
  nome_completo: string;
  data_nascimento: string;
  telefone_whatsapp: string;
  email: string;
  endereco_bairro: string;
  cidade_estado: string;
  objetivo: string;
  experiencia_previa: boolean;
  quais_experiencias?: string | null;
  como_conheceu: string;
  turma_campanha: string;
  origem: string;
  status: 'pendente_confirmacao' | 'confirmado' | 'matriculado' | 'cancelado';
  created_at: string;
}

type SecaoAcademica='visao'|'turmas'|'estudantes'|'docentes'|'agenda'|'frequencia';
type DestinoAdmin=SecaoAcademica|'ingressos'|'inscricoes'|'secretaria'|'financeiro'|'clientes';
export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [areaAtiva, setAreaAtiva] = useState<'academico' | 'ingressos' | 'inscricoes' | 'secretaria' | 'financeiro' | 'clientes'>('academico');
  const [secaoAcademica,setSecaoAcademica]=useState<SecaoAcademica>('visao');
  const [destinoSolicitado,setDestinoSolicitado]=useState<DestinoAdmin|null>(null);
  const [rascunhoAcademicoPendente,setRascunhoAcademicoPendente]=useState(false);
  const [rascunhoGestaoPendente,setRascunhoGestaoPendente]=useState(false);
  const [rascunhoIngressosPendente,setRascunhoIngressosPendente]=useState(false);
  const [rascunhoFinanceiroPendente,setRascunhoFinanceiroPendente]=useState(false);
  const [rascunhoMatriculaPendente,setRascunhoMatriculaPendente]=useState(false);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acessoAutorizado, setAcessoAutorizado] = useState(false);
  const [papeisGestao, setPapeisGestao] = useState<PapelGestao[]>([]);
  const podeAlterarStatus = papeisGestao.includes('coordenacao');
  const podeMatricular = papeisGestao.some(p=>p==='secretaria'||p==='coordenacao');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [campanhaFilter, setCampanhaFilter] = useState<FiltroCampanha>('formacao');
  const [selectedInscricao, setSelectedInscricao] = useState<Inscricao | null>(null);
  const fichaDialogRef = useRef<HTMLDivElement>(null);
  const fichaFocoAnteriorRef = useRef<HTMLElement | null>(null);
  const fichaAberta = selectedInscricao !== null;
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const destinoAtivo:DestinoAdmin=areaAtiva==='academico'?secaoAcademica:areaAtiva;
  const aplicarDestino=(destino:DestinoAdmin)=>{
    // Sem serviços R12/R14/Pix homologados, somente a secretaria legada e o acadêmico essencial.
    if(!ACOES_ACADEMICAS_EXCLUSIVAS_DEV && (destino==='financeiro'||destino==='clientes'))return;
    const destinoSeguro:DestinoAdmin=!ACOES_ACADEMICAS_EXCLUSIVAS_DEV && destino==='inscricoes'
      ?'secretaria':destino;
    if(['visao','turmas','estudantes','docentes','agenda','frequencia'].includes(destinoSeguro)){
      setSecaoAcademica(destinoSeguro as SecaoAcademica);setAreaAtiva('academico');
    }else setAreaAtiva(destinoSeguro as 'ingressos'|'inscricoes'|'secretaria'|'financeiro'|'clientes');
    setSelectedInscricao(null);
  };
  const solicitarDestino=(destino:DestinoAdmin)=>{
    if(destino===destinoAtivo)return;
    const pendente=rascunhoMatriculaPendente||(areaAtiva==='academico'?rascunhoAcademicoPendente:
      areaAtiva==='inscricoes'?rascunhoGestaoPendente:
      areaAtiva==='ingressos'?rascunhoIngressosPendente:
      areaAtiva==='financeiro'?rascunhoFinanceiroPendente:false);
    if(pendente){setDestinoSolicitado(destino);return;}
    aplicarDestino(destino);
  };
  const solicitarFechamentoFicha=useCallback(()=>{
    if(rascunhoMatriculaPendente&&!window.confirm('Descartar a matrícula em preenchimento?'))return;
    setSelectedInscricao(null);
  },[rascunhoMatriculaPendente]);

  // Guarda o foco do botão que abriu a ficha e o devolve no fechamento.
  useEffect(()=>{
    if(!fichaAberta)return;
    const anterior=document.activeElement;
    fichaFocoAnteriorRef.current=anterior instanceof HTMLElement?anterior:null;
    fichaDialogRef.current?.focus();
    return ()=>{
      fichaFocoAnteriorRef.current?.focus();
      fichaFocoAnteriorRef.current=null;
    };
  },[fichaAberta]);

  // Escape e Tab só operam na ficha aberta; diálogos nativos internos têm prioridade.
  useEffect(()=>{
    if(!fichaAberta)return;
    const aoTeclar=(evento:KeyboardEvent)=>{
      if(document.querySelector('dialog[open]'))return;
      if(evento.key==='Escape'){
        evento.preventDefault();
        solicitarFechamentoFicha();
        return;
      }
      if(evento.key!=='Tab')return;
      const modal=fichaDialogRef.current;
      if(!modal)return;
      const focaveis=Array.from(modal.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )).filter(elemento=>elemento.getClientRects().length>0);
      if(!focaveis.length){evento.preventDefault();modal.focus();return;}
      const primeiro=focaveis[0],ultimo=focaveis[focaveis.length-1];
      if(evento.shiftKey&&(document.activeElement===primeiro||document.activeElement===modal)){
        evento.preventDefault();ultimo.focus();
      }else if(!evento.shiftKey&&document.activeElement===ultimo){
        evento.preventDefault();primeiro.focus();
      }
    };
    document.addEventListener('keydown',aoTeclar);
    return ()=>document.removeEventListener('keydown',aoTeclar);
  },[fichaAberta,solicitarFechamentoFicha]);
  const confirmarDescarteDestino=()=>{
    if(!destinoSolicitado)return;
    const destino=destinoSolicitado;setDestinoSolicitado(null);aplicarDestino(destino);
  };

  // Carregar dados de autenticação e inscrições
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setAcessoAutorizado(false);
    setPapeisGestao([]);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user || user.is_anonymous) {
        setCurrentUserEmail(null);
        setPapeisGestao([]);
        setInscricoes([]);
        setSelectedInscricao(null);
        router.replace('/admin/login');
        return;
      }

      // Acesso exige membership em portal_admins e pelo menos um papel válido.
      const papeis = await obterPapeisGestao(supabase, user.id);
      if (papeis.length === 0) {
        setCurrentUserEmail(null);
        setPapeisGestao([]);
        setInscricoes([]);
        setSelectedInscricao(null);
        router.replace('/admin/login?acesso=restrito');
        return;
      }

      setCurrentUserEmail(user.email ?? 'Equipe');
      setPapeisGestao(papeis);
      setAcessoAutorizado(true);

      // Ler todas as inscrições, não apenas as primeiras 1.000 retornadas pelo PostgREST.
      // Erro em qualquer página invalida a lista: não exibir um histórico incompleto.
      const registros: Inscricao[] = [];
      const TAMANHO_PAGINA = 500;
      let consultaIncompleta = false;
      for (let pagina = 0; pagina < 200; pagina++) {
        const { data, error } = await supabase
          .from('inscricoes_oficina')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(pagina * TAMANHO_PAGINA, (pagina + 1) * TAMANHO_PAGINA - 1);
        if (error) {
          console.error('Erro ao buscar inscrições:', error);
          setFeedbackMessage('Não foi possível consultar todas as inscrições. Verifique suas permissões.');
          consultaIncompleta = true;
          break;
        }
        const lote = (data ?? []) as Inscricao[];
        registros.push(...lote);
        if (lote.length < TAMANHO_PAGINA) break;
        if (pagina === 199) {
          setFeedbackMessage('O total de inscrições excedeu o limite seguro da consulta. Nenhuma lista parcial será exibida.');
          consultaIncompleta = true;
        }
      }
      setInscricoes(consultaIncompleta ? [] : registros);
      if (!consultaIncompleta) setFeedbackMessage(null);
    } catch (err) {
      console.error('Erro geral no dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Sem expor estado da gestão após logout ou invalidação da sessão.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === 'SIGNED_OUT' || !sessao) {
        setAcessoAutorizado(false);
        setPapeisGestao([]);
        setCurrentUserEmail(null);
        setPapeisGestao([]);
        setInscricoes([]);
        setSelectedInscricao(null);
        router.replace('/admin/login');
      }
    });
    return () => subscription.unsubscribe();
  }, [router, supabase]);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  // A RPC transacional já confirmou inscrição + matrícula. Atualize somente
  // a ficha aberta, sem descarregar todo o painel e perder o botão do convite.
  const registrarMatriculaConfirmada = useCallback((inscricaoId: string) => {
    setInscricoes(atuais => atuais.map(item =>
      item.id === inscricaoId ? { ...item, status: 'matriculado' } : item
    ));
    setSelectedInscricao(atual =>
      atual?.id === inscricaoId ? { ...atual, status: 'matriculado' } : atual
    );
  }, []);

  // Uma mesma ficha é usada em Gestão de inscrições e Secretaria.
  const atualizarFichaGestao = (id: string, alteracao: Partial<Inscricao>) => {
    setInscricoes(atuais => atuais.map(item => item.id === id ? {...item,...alteracao} : item));
    setSelectedInscricao(atual => atual?.id === id ? {...atual,...alteracao} : atual);
  };

  // Alterar Status da Inscrição
  const handleStatusChange = async (id: string, newStatus: Inscricao['status']) => {
    if (!acessoAutorizado || !podeAlterarStatus) return; // UI e RLS de Coordenação.
    if (newStatus === 'matriculado' || inscricoes.some(item => item.id === id && item.status === 'matriculado')) {
      setFeedbackMessage('Matrícula exige ingresso transacional com Pix conferido ou bolsa autorizada. Não altere esse status diretamente.');
      return;
    }
    setIsUpdatingStatus(id);
    setFeedbackMessage(null);

    try {
      // Não aceitar permissões desatualizadas de uma sessão revogada.
      const { data: { user } } = await supabase.auth.getUser();
      const papeisAtuais = user && !user.is_anonymous
        ? await obterPapeisGestao(supabase, user.id) : [];
      if (!papeisAtuais.includes('coordenacao')) {
        setPapeisGestao(papeisAtuais);
        setAcessoAutorizado(false);
        setInscricoes([]);
        setSelectedInscricao(null);
        router.replace('/admin/login?acesso=restrito');
        return;
      }
      const { data: atualizada, error } = await supabase
        .from('inscricoes_oficina')
        .update({ status: newStatus })
        .eq('id', id)
        .select('id,status')
        .maybeSingle();

      if (error || !atualizada || atualizada.status !== newStatus) {
        setFeedbackMessage('Atualização não confirmada. Confira sua permissão e recarregue os dados.');
      } else {
        setInscricoes((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
        if (selectedInscricao && selectedInscricao.id === id) {
          setSelectedInscricao((prev) => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch {
      setFeedbackMessage('Erro de conexão ao atualizar status.');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Segmentação somente de leitura: não altera nenhuma linha histórica no banco.
  const totaisCampanha = useMemo(() => ({
    formacao: inscricoes.filter((i) => classificarCampanha(i.turma_campanha) === 'formacao').length,
    historico: inscricoes.filter((i) => classificarCampanha(i.turma_campanha) === 'historico').length,
    outras: inscricoes.filter((i) => classificarCampanha(i.turma_campanha) === 'outras').length,
  }), [inscricoes]);

  const inscricoesDaCampanha = useMemo(
    () => inscricoes.filter((i) => campanhaFilter === 'todas' || classificarCampanha(i.turma_campanha) === campanhaFilter),
    [inscricoes, campanhaFilter]
  );

  // KPIs pertencem ao grupo selecionado; não misturam campanhas.
  const stats = useMemo(() => {
    const total = inscricoesDaCampanha.length;
    const pendentes = inscricoesDaCampanha.filter((i) => i.status === 'pendente_confirmacao').length;
    const confirmados = inscricoesDaCampanha.filter((i) => i.status === 'confirmado').length;
    const matriculados = inscricoesDaCampanha.filter((i) => i.status === 'matriculado').length;

    // Inscrições das últimas 24h
    const agora = new Date().getTime();
    const ultimas24h = inscricoesDaCampanha.filter((i) => {
      const criadaEm = new Date(i.created_at).getTime();
      return agora - criadaEm <= 24 * 60 * 60 * 1000;
    }).length;

    return { total, pendentes, confirmados, matriculados, ultimas24h };
  }, [inscricoesDaCampanha]);

  // Filtros
  const filteredInscricoes = useMemo(() => {
    return inscricoesDaCampanha.filter((item) => {
      const matchesSearch =
        item.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.telefone_whatsapp.includes(searchTerm) ||
        item.cidade_estado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.endereco_bairro.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'todos' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inscricoesDaCampanha, searchTerm, statusFilter]);

  // Formatação de data
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  // Exportar para CSV
  const exportarInscricoes = async (registros: Inscricao[]) => {
    if (!acessoAutorizado || !podeAlterarStatus || registros.length === 0) return;
    // Confirmar papel atual antes de copiar dados pessoais para um CSV.
    const { data: { user } } = await supabase.auth.getUser();
    const papeisAtuais = user && !user.is_anonymous
      ? await obterPapeisGestao(supabase, user.id) : [];
    if (!papeisAtuais.includes('coordenacao')) {
      setFeedbackMessage('Exportação reservada à coordenação autorizada.');
      setPapeisGestao(papeisAtuais);
      return;
    }
    const headers = [
      'Data de Inscrição',
      'Nome Completo',
      'WhatsApp',
      'E-mail',
      'Data de Nascimento',
      'Bairro',
      'Cidade/UF',
      'Objetivo',
      'Possui Experiência',
      'Detalhes da Experiência',
      'Como Conheceu',
      'Campanha',
      'Origem',
      'Status',
    ];

    // Protege exportações de conteúdo cadastrado por terceiros (CSV injection).
    const rows = registros.map((i) => [
      formatDate(i.created_at), i.nome_completo, i.telefone_whatsapp, i.email,
      i.data_nascimento, i.endereco_bairro, i.cidade_estado, i.objetivo,
      i.experiencia_previa ? 'Sim' : 'Não', i.quais_experiencias || '',
      i.como_conheceu, i.turma_campanha, i.origem, i.status,
    ]);

    const csvContent = gerarCsvExcel(headers, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `educart-inscricoes-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => exportarInscricoes(filteredInscricoes);

  // Gerar link formatado de WhatsApp para atender o candidato
  const getWhatsAppContactLink = (item: Inscricao) =>
    linkPrimeiroContatoSecretaria(item.telefone_whatsapp, item.nome_completo);

  if (isLoading || !acessoAutorizado) {
    return (
      <div className="admin-container" role="status" aria-live="polite" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          Verificando autorização de acesso ao painel EducART...
        </p>
      </div>
    );
  }

  return (
    <>
      {/* NAVBAR SUPERIOR */}
      <header className="admin-navbar">
        <div className="admin-brand-wrap">
          <EducartLogo size="default" />
        </div>

        <div className="admin-nav-actions">
          {currentUserEmail && (
            <div className="admin-user-tag">
              <span aria-hidden="true">👤</span>
              <span>{currentUserEmail}</span>
            </div>
          )}
          <span className="admin-badge-pill" aria-label="Papéis administrativos autorizados">
            {papeisGestao.includes('coordenacao') && papeisGestao.includes('secretaria')
              ? 'Gestão unificada'
              : papeisGestao.includes('coordenacao') ? 'Coordenação' : 'Secretaria'}
          </span>
          <Link href="/" target="_blank" className="admin-btn admin-btn-secondary" title="Abrir página pública">
            <span>↗ Abrir portal</span>
          </Link>
          <button onClick={handleLogout} className="admin-btn admin-btn-danger">
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* CONTAINER PRINCIPAL */}
      <div className="admin-container">
        {papeisGestao.includes('coordenacao') && papeisGestao.includes('secretaria') && (
          <div className="admin-single-operator-note" role="note">
            <strong>Operação individual · gestão unificada</strong>
            <span>Este painel é reservado ao único operador administrativo autorizado. Secretaria, Coordenação, Acadêmico, Gestão de inscrições e Financeiro são áreas do mesmo portal, não usuários diferentes. As ações são registradas na conta autenticada; mantenha suas credenciais pessoais e documente conferências sensíveis.</span>
          </div>
        )}
        {/* Houston V9.5 PALCO-02 define a arquitetura de navegação.
            Os módulos operacionais preexistentes permanecem sob suas próprias permissões. */}
        <div className="houston95-dashboard">
          <AdminHouston95Navegacao
            ativo={destinoAtivo==='ingressos'||destinoAtivo==='clientes'?'secretaria':destinoAtivo}
            habilitarFinanceiro={ACOES_ACADEMICAS_EXCLUSIVAS_DEV}
            habilitarGestaoInscricoes={ACOES_ACADEMICAS_EXCLUSIVAS_DEV}
            navegar={solicitarDestino}
          />
          <main className="houston95-main">
        {areaAtiva === 'clientes' && ACOES_ACADEMICAS_EXCLUSIVAS_DEV ? (
          <AdminClientesDev supabase={supabase} podeConsultar={podeMatricular} podeGerirVinculos={podeAlterarStatus} />
        ) : areaAtiva === 'academico' ? (
          secaoAcademica==='visao'
            ? <AdminHouston95VisaoDev supabase={supabase} navegar={solicitarDestino}/>
            : <AdminRotinaAcademicaLab supabase={supabase} podeGerir={podeAlterarStatus}
                secao={secaoAcademica} onSolicitarSecao={solicitarDestino}
                onRascunhoPendenteChange={setRascunhoAcademicoPendente} />
        ) : areaAtiva === 'ingressos' && ACOES_ACADEMICAS_EXCLUSIVAS_DEV ? (
          <AdminIngressosSimplesDev supabase={supabase} podeGerir={podeAlterarStatus}
            onAbrirDocentes={()=>solicitarDestino('docentes')}
            onRascunhoPendenteChange={setRascunhoIngressosPendente}/>
        ) : areaAtiva === 'inscricoes' && ACOES_ACADEMICAS_EXCLUSIVAS_DEV ? (
          <AdminGestaoInscricoesDev inscricoes={inscricoes} erroConsulta={feedbackMessage}
            onRascunhoPendenteChange={setRascunhoGestaoPendente}
            supabase={supabase} podeGerir={podeAlterarStatus} podeAtender={podeMatricular}
            onAtualizar={atualizarFichaGestao}
            onExportar={ids => exportarInscricoes(inscricoes.filter(item => ids.includes(item.id)))}
            onAbrirFicha={id => { const ficha = inscricoes.find(item => item.id === id); if (ficha) setSelectedInscricao(ficha); }} />
        ) : areaAtiva === 'financeiro' && ACOES_ACADEMICAS_EXCLUSIVAS_DEV ? (
          <AdminFinanceiroDev supabase={supabase} podeGerir={podeAlterarStatus}
            onRascunhoPendenteChange={setRascunhoFinanceiroPendente} />
        ) : (
          <>
            {/* 1.2: admissão, Pix/bolsa e convite numa única ficha de inscrição. */}
            <>
        {/* TÍTULO E BOTÃO EXPORTAR */}
        <div className="admin-header-row">
          <div>
            <span className="admin-kicker">EDUCART / GESTÃO ACADÊMICA</span>
            <h1 className="admin-page-title">Secretaria e matrículas<span className="admin-title-accent">.</span> <AdminAjuda titulo={"Secretaria e matrículas."} descricao={"Acompanhe candidatos e formalize matrículas autorizadas sem perder históricos."} passos={"Filtre por campanha ou nome e abra a ficha para encaminhar a matrícula."} cuidado={"Matrícula exige Pix conferido ou bolsa autorizada."} /></h1>
            <p className="admin-page-desc">
              {ACOES_ACADEMICAS_EXCLUSIVAS_DEV?'Consulte candidaturas, confira ingresso com Pix ou bolsa e preserve o histórico acadêmico da instituição.':'Consulte candidaturas e preserve os registros existentes. Matrícula financeira e convites aguardam homologação.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={loadDashboardData} className="admin-btn admin-btn-secondary" title="Recarregar dados">
              <span>↻ Atualizar</span>
            </button>
            <button onClick={handleExportCSV} className="admin-btn admin-btn-success" disabled={!podeAlterarStatus || filteredInscricoes.length === 0} title={podeAlterarStatus ? 'Exportar inscrições' : 'Exportação restrita à coordenação'}>
              <span>↓ Exportar CSV do filtro</span>
            </button>
          </div>
        </div>

        {feedbackMessage && (
          <div className="login-error-banner" style={{ marginBottom: '20px' }}>
            {feedbackMessage}
          </div>
        )}

        {/* Os indicadores de inscrição usam a mesma interação em ambas as áreas. */}
        <AdminIndicadoresInscricoesDev inscricoes={inscricoesDaCampanha}
         tituloTotal="Inscrições na campanha selecionada"
         descricaoTotal={stats.ultimas24h>0?`+${stats.ultimas24h} cadastros nas últimas 24h`:'Campanha selecionada'}
         onAbrirFicha={id=>{const ficha=inscricoes.find(i=>i.id===id);if(ficha)setSelectedInscricao(ficha);}}
         onExibirLista={tipo=>{setSearchTerm('');
           setStatusFilter(tipo==='total'?'todos':tipo==='pendentes'?'pendente_confirmacao':
             tipo==='confirmadas'?'confirmado':'matriculado');}}/>

        {/* CARD INFORMATIVO DE TRÁFEGO & VISITAS */}
        <div className="admin-traffic-card">
          <div className="traffic-info-left">
            <div className="traffic-icon-box" aria-hidden="true">
              📈
            </div>
            <div>
              <h2 className="traffic-title">Inscrições organizadas. Histórico preservado. <AdminAjuda titulo={"Inscrições organizadas. Histórico preservado."} descricao={"Lista de inscrições atuais e históricas."} passos={"Filtre por campanha e situação para não misturar períodos."} /></h2>
              <p className="traffic-subtitle">
                Filtre as inscrições por formação ou campanha, consulte cada ficha e acompanhe os status cadastrais. <strong>Matrícula efetivada diretamente da ficha com Pix conferido ou bolsa autorizada.</strong>
              </p>
            </div>
          </div>
          <div className="traffic-actions">
            <span className="admin-traffic-note">Leitura por campanha</span>
          </div>
        </div>

        {/* SELEÇÃO EXPLÍCITA: a formação atual não absorve campanhas anteriores. */}
        <div className="admin-data-summary" role="status" aria-live="polite">
          Base preservada: {inscricoes.length} inscrições · Formação atual: {totaisCampanha.formacao} · Outubro/2026: {totaisCampanha.historico} · Outras: {totaisCampanha.outras}.
          Os indicadores abaixo consideram somente a campanha selecionada. Status cadastral não confirma pagamento.
        </div>
        {/* BARRA DE BUSCA E FILTROS */}
        <div className="admin-filters-bar" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label htmlFor="filter-campanha-select" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Campanha:</label>
            <select
              id="filter-campanha-select"
              className="filter-select"
              value={campanhaFilter}
              onChange={(e) => { setCampanhaFilter(e.target.value as FiltroCampanha); setStatusFilter('todos'); }}
            >
              <option value="formacao">Formação de Atores · 2 anos ({totaisCampanha.formacao})</option>
              <option value="historico">Histórico · Outubro/2026 ({totaisCampanha.historico})</option>
              <option value="outras">Outras campanhas ({totaisCampanha.outras})</option>
              <option value="todas">Todas as campanhas ({inscricoes.length})</option>
            </select>
          </div>
          <div className="search-input-wrap">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, telefone ou bairro..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="filter-status-select" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Status:
            </label>
            <select
              id="filter-status-select"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="todos">Todos os Status ({inscricoesDaCampanha.length})</option>
              <option value="pendente_confirmacao">Pendentes ({stats.pendentes})</option>
              <option value="confirmado">Confirmados ({stats.confirmados})</option>
              <option value="matriculado">Matriculados ({stats.matriculados})</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
        </div>

        {/* TABELA DE INSCRIÇÕES */}
        <div className="admin-table-container">
          {filteredInscricoes.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {searchTerm || statusFilter !== 'todos' || campanhaFilter !== 'todas'
                ? 'Nenhuma inscrição encontrada para os filtros aplicados.'
                : 'Nenhuma inscrição registrada ainda.'}
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Candidato</th>
                  <th>Contato</th>
                  <th>Localização</th>
                  <th>Objetivo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredInscricoes.map((item) => (
                  <tr key={item.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {formatDate(item.created_at)}
                    </td>
                    <td>
                      <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                        {item.nome_completo}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {item.experiencia_previa ? '🎭 Com experiência prévia' : '✨ Iniciante'}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)' }} title={item.turma_campanha}>
                        {NOME_GRUPO_CAMPANHA[classificarCampanha(item.turma_campanha)]}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.88rem' }}>{item.telefone_whatsapp}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.email}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.88rem' }}>{item.endereco_bairro}</span>
                      <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {item.cidade_estado}
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.84rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={item.objetivo}
                      >
                        {item.objetivo}
                      </span>
                    </td>
                    <td>
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as Inscricao['status'])}
                        disabled={!podeAlterarStatus || isUpdatingStatus === item.id}
                        aria-label={podeAlterarStatus ? 'Alterar status da inscrição' : 'Status da inscrição: somente coordenação pode alterar'}
                        className={`status-badge status-${item.status}`}
                        style={{ cursor: podeAlterarStatus ? 'pointer' : 'not-allowed', outline: 'none' }}
                      >
                        <option value="pendente_confirmacao">Pendente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="matriculado" disabled>Matriculado · via ingresso</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                    <td>
                      <div className="action-buttons-cell">
                        <a
                          href={getWhatsAppContactLink(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="quick-action-btn whatsapp-btn"
                          title="Falar no WhatsApp com o candidato"
                            aria-label="Abrir WhatsApp do candidato com mensagem de primeiro contato"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                          </svg>
                        </a>
                        <button
                          type="button"
                          onClick={() => setSelectedInscricao(item)}
                          className="quick-action-btn"
                          title="Visualizar ficha completa"
                        >
                          👁️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>


            </>
          </>
        )}
          </main>
        </div>
      </div>

      {/* Rodapé reservado para conferências eventuais, depois de toda a lista operacional. */}
      {areaAtiva === 'secretaria' && ACOES_ACADEMICAS_EXCLUSIVAS_DEV && (
        <section className="admin-container admin-secretaria-footer" aria-label="Ferramentas de apoio da Secretaria" data-layout-revision="conferencias-rodape-r16">
          <h2 className="admin-secretaria-footer-title">Ferramentas de conferência <AdminAjuda titulo="Ferramentas de conferência" descricao="Consultas auxiliares de retornos e integridade de matrículas, sem mudar registros automaticamente." /></h2>
          <p className="admin-secretaria-footer-desc">Consulta de retornos e integridade cadastral. Essas ferramentas não interferem nas matrículas nem nos pagamentos.</p>
          <div className="admin-secretaria-footer-items">
      <details className="admin-academico-panel">
                <summary style={{cursor:'pointer',fontWeight:700,fontSize:16,padding:'8px 0'}}>
                  Retornos de atendimento
                </summary>
                <AdminAtendimentoR12Dev supabase={supabase} podeGerir={podeMatricular} modo="fila" />
              </details>
      
              {podeAlterarStatus&&<details className="admin-academico-panel">
                <summary style={{cursor:'pointer',fontWeight:700,fontSize:16,padding:'8px 0'}}>
                  Conferir integridade das matrículas
                </summary>
                <AdminIntegridadeMatriculasR12Dev
                  supabase={supabase} podeGerir={podeAlterarStatus}
                  inscricoes={inscricoes}
                  aoAbrir={id=>{
                    const ficha=inscricoes.find(i=>i.id===id);
                    if(ficha)setSelectedInscricao(ficha);
                  }}
                />
              </details>}
          </div>
        </section>
      )}

      {destinoSolicitado&&<AdminRegistroModalDev titulo="Descartar alterações não salvas?"
        descricao="A navegação foi interrompida para proteger o formulário em andamento."
        onClose={()=>setDestinoSolicitado(null)}>
        <p>Se sair desta área, as alterações ainda não salvas serão perdidas. Permanecer conserva os campos preenchidos.</p>
        <div className="admin-academico-actions">
          <button type="button" className="admin-btn admin-btn-secondary"
            onClick={()=>setDestinoSolicitado(null)}>Permanecer no formulário</button>
          <button type="button" className="admin-btn admin-btn-primary"
            onClick={confirmarDescarteDestino}>Descartar alterações e sair</button>
        </div>
      </AdminRegistroModalDev>}
      {/* MODAL DETALHES COMPLETOS DA FICHA */}
      {selectedInscricao && (
        <div className="admin-modal-backdrop" onClick={() => solicitarFechamentoFicha()}>
          <div ref={fichaDialogRef} role="dialog" aria-modal="true" aria-labelledby="admin-ficha-heading"
            tabIndex={-1} className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className={`status-badge status-${selectedInscricao.status}`}>
                  {selectedInscricao.status.replace('_', ' ')}
                </span>
                <h2 id="admin-ficha-heading" className="modal-title" style={{ marginTop: '8px' }}>
                  {selectedInscricao.nome_completo}
                </h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => solicitarFechamentoFicha()}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="detail-grid">
              <div className="detail-field">
                <span className="detail-label">Data de Inscrição</span>
                <span className="detail-value">{formatDate(selectedInscricao.created_at)}</span>
              </div>

              <div className="detail-field">
                <span className="detail-label">Campanha de origem</span>
                <span className="detail-value">{selectedInscricao.turma_campanha || 'Não identificada'}</span>
              </div>

              <div className="detail-field">
                <span className="detail-label">Data de Nascimento</span>
                <span className="detail-value">{selectedInscricao.data_nascimento}</span>
              </div>

              <div className="detail-field">
                <span className="detail-label">WhatsApp</span>
                <span className="detail-value">{selectedInscricao.telefone_whatsapp}</span>
              </div>

              <div className="detail-field">
                <span className="detail-label">E-mail</span>
                <span className="detail-value">{selectedInscricao.email}</span>
              </div>

              <div className="detail-field">
                <span className="detail-label">Bairro</span>
                <span className="detail-value">{selectedInscricao.endereco_bairro}</span>
              </div>

              <div className="detail-field">
                <span className="detail-label">Cidade / Estado</span>
                <span className="detail-value">{selectedInscricao.cidade_estado}</span>
              </div>

              <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">Objetivo Principal</span>
                <span className="detail-value">{selectedInscricao.objetivo}</span>
              </div>

              <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">Experiência Prévia</span>
                <span className="detail-value">
                  {selectedInscricao.experiencia_previa
                    ? selectedInscricao.quais_experiencias || 'Informou ter experiência sem detalhes adicionais'
                    : 'Nenhuma experiência prévia (Iniciante)'}
                </span>
              </div>

              <div className="detail-field">
                <span className="detail-label">Como Conheceu</span>
                <span className="detail-value">{selectedInscricao.como_conheceu}</span>
              </div>

              <div className="detail-field">
                <span className="detail-label">Origem do Cadastro</span>
                <span className="detail-value">{selectedInscricao.origem}</span>
              </div>
            </div>

            {ACOES_ACADEMICAS_EXCLUSIVAS_DEV ? <>
              <AdminMatriculaUnificadaDev
                key={selectedInscricao.id}
                supabase={supabase}
                inscricao={selectedInscricao}
                podeOperar={podeMatricular}
                podeAutorizarBolsa={podeAlterarStatus}
                aoMatricular={registrarMatriculaConfirmada}
                onRascunhoPendenteChange={setRascunhoMatriculaPendente}
              />
              <AdminAtendimentoR12Dev
                supabase={supabase}
                podeGerir={podeMatricular}
                modo="ficha"
                inscricaoId={selectedInscricao.id}
              />
            </> : <p className="admin-academico-note" role="note">
              Inscrição histórica preservada. A efetivação Pix/bolsa, o convite e o registro de atendimento
              exigem serviços ainda não homologados nesta 1.1. Para um vínculo acadêmico pendente,
              acesse Formações e turmas → Gerir alunos após a Coordenação conferir a documentação.
            </p>}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <a
                href={getWhatsAppContactLink(selectedInscricao)}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn admin-btn-success"
                aria-label="Chamar candidato no WhatsApp com mensagem de primeiro contato"
              >
                <span>Chamar no WhatsApp ↗</span>
              </a>

              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => solicitarFechamentoFicha()}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

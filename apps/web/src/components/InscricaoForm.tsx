'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { mapearTriagemInscricao, type TriagemInscricao } from '@/lib/triagem-inscricao';
import { validateStep, buildInscricaoPayload, type InscricaoFormData } from '@/lib/inscricao-validation';
import { calcularIdade, IDADE_MINIMA_FORMACAO } from '@/lib/idade-formacao';
import { mensagemCandidatoInscrito } from '@/lib/mensagens-whatsapp';
import { CasaGameleiraLink, HORARIO_TURMA_FORMACAO, NOME_LOCAL_FORMACAO } from '@/components/CasaGameleiraLink';
import { destinoPublicoInscricaoSeguro } from '@/lib/security/destino-inscricao-publica';

const WHATSAPP_NUMBER = '5571996824505';
const PHONE_DISPLAY = '(71) 99682-4505';

export function InscricaoForm() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [destinoInvalido, setDestinoInvalido] = useState(false);
  useEffect(() => {
    setDestinoInvalido(!destinoPublicoInscricaoSeguro(
      window.location.hostname, process.env.NEXT_PUBLIC_SUPABASE_URL,
    ));
  }, []);
  const [triagem, setTriagem] = useState<TriagemInscricao | null>(null);
  const [editarTriagem, setEditarTriagem] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // O formulário pode terminar abaixo da área visível após três etapas.
  // Levar o foco à confirmação ou ao erro evita a aparência de envio travado.
  useEffect(() => {
    const feedback = isSuccess ? successRef.current : errorMessage ? errorRef.current : null;
    if (!feedback) return;
    feedback.focus({ preventScroll: true });
    // 'instant' não herda scroll-behavior: smooth do CSS global.
    // A mensagem deve aparecer de imediato, inclusive no celular.
    feedback.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [isSuccess, errorMessage]);

  // Form State
  const [formData, setFormData] = useState<InscricaoFormData>({
    objetivo: 'Ser Ator/Atriz profissional',
    objetivoOutro: '',
    dataNascimento: '',
    nomeCompleto: '',
    endereco: '',
    cidadeEstado: 'Salvador/BA',
    cidadeEstadoOutro: '',
    telefone: '',
    email: '',
    experienciaPrevia: 'Não',
    quaisExperiencias: '',
    comoConheceu: 'Instagram',
    comoConheceuOutro: '',
  });

  useEffect(() => {
    const contexto = mapearTriagemInscricao(window.location.search);
    if (!contexto) return;
    setTriagem(contexto);
    setFormData(prev => ({
      ...prev,
      ...(contexto.objetivo ? { objetivo: contexto.objetivo, objetivoOutro: contexto.objetivoOutro || '' } : {}),
      ...(contexto.experienciaPrevia ? { experienciaPrevia: contexto.experienciaPrevia } : {}),
    }));
  }, []);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMessage('');
  };

  const handleNextStep = () => {
    const result = validateStep(step, formData);
    if (!result.valid) {
      setErrorMessage(result.errorMessage);
      return;
    }
    setErrorMessage('');
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setErrorMessage('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Defesa redundante: falha fechada mesmo se o proxy for contornado por
    // cache HTML ou servidor legado. Nunca fazer POST no Supabase DEV.
    if (!destinoPublicoInscricaoSeguro(
      window.location.hostname, process.env.NEXT_PUBLIC_SUPABASE_URL,
    )) {
      setDestinoInvalido(true);
      setErrorMessage('As inscrições online estão temporariamente indisponíveis. Contate a EducART pelo WhatsApp.');
      return;
    }

    const result = validateStep(3, formData);
    if (!result.valid) {
      setErrorMessage(result.errorMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const supabase = createClient();
      const payload = buildInscricaoPayload(formData);

      const { error } = await supabase.from('inscricoes_oficina').insert([payload]);

      if (error) {
        if (error.code === '23505') {
          setErrorMessage(
            'Este e-mail ou telefone já possui uma inscrição registrada. Nossa coordenação entrará em contato!'
          );
        } else {
          setErrorMessage(
            'Ocorreu um erro ao registrar sua ficha. Por favor, tente novamente ou entre em contato pelo WhatsApp.'
          );
        }
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      setErrorMessage('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const idadeInformada = formData.dataNascimento ? calcularIdade(formData.dataNascimento) : null;
  const naoElegivel = idadeInformada !== null && idadeInformada >= 0 && idadeInformada < IDADE_MINIMA_FORMACAO;
  const cleanPhone = formData.telefone.replace(/\D/g, '');
  const whatsappMessage = encodeURIComponent(mensagemCandidatoInscrito({
    nome: formData.nomeCompleto,
    telefone: formData.telefone,
    objetivo: formData.objetivo === 'Outro' ? formData.objetivoOutro : formData.objetivo,
  }));
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

  if (destinoInvalido) {
    return (
      <section role="alert" aria-live="assertive" className="multi-step-form-wrapper">
        <h2>Inscrições temporariamente indisponíveis</h2>
        <p>Para proteger seus dados, o envio da ficha online está suspenso neste endereço.
          Nenhuma inscrição é enviada por esta página.</p>
        <p>Converse com a equipe da EducART para receber orientação sobre sua inscrição.</p>
        <a className="btn btn-whatsapp" href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank" rel="noopener noreferrer">Falar com a EducART pelo WhatsApp</a>
      </section>
    );
  }

  if (isSuccess) {
    return (
      <div ref={successRef} tabIndex={-1} className="form-success-card" role="region" aria-label="Inscrição concluída" aria-live="polite" style={{ scrollMarginTop: 24 }}>
        <div className="success-icon" aria-hidden="true">
          ✓
        </div>
        <h3 className="success-title">Inscrição Enviada com Sucesso!</h3>
        <p className="success-desc">
          Olá <strong>{formData.nomeCompleto}</strong>, sua ficha de inscrição para a <strong>Formação de Atores</strong> da Oficina de Atores Salvador foi registrada com sucesso sob chancela EducART.
        </p>

        <div className="success-investment-box registration-details">
          <div className="investment-header">
            <span>🎭 Resumo da Formação de Atores</span>
          </div>
          <div className="registration-details-grid">
            <div className="registration-detail">
              <span className="registration-detail-label">Horários das aulas</span>
              <strong className="registration-detail-value">{HORARIO_TURMA_FORMACAO}</strong>
            </div>
            <div className="registration-detail">
              <span className="registration-detail-label">Investimento</span>
              <strong className="registration-detail-value">Matrícula: R$ 50 · Mensalidade: R$ 320</strong>
              <span className="registration-detail-note">Valores de referência. Confirme as condições atuais com a coordenação.</span>
            </div>
            <div className="registration-detail registration-detail-place">
              <span className="registration-detail-label">Local das aulas</span>
              <strong className="registration-detail-value">{NOME_LOCAL_FORMACAO}</strong>
              <CasaGameleiraLink />
            </div>
          </div>
        </div>

        <section className="success-investment-box registration-details" aria-labelledby="contrato-minuta-pos-inscricao">
          <div className="investment-header">
            <span id="contrato-minuta-pos-inscricao">📄 Contrato da formação — minuta para consulta</span>
          </div>
          <p className="success-desc">
            Você pode baixar a minuta do contrato de prestação de serviços educacionais da Oficina de Atores Salvador
            para ler e guardar. O documento contém campos que serão preenchidos com as condições da sua turma.
          </p>
          <p className="registration-detail-note">
            <strong>Documento em revisão, não aprovado para assinatura.</strong> O envio desta inscrição
            não efetiva matrícula, não gera cobrança e não autoriza pagamento. A Secretaria confirmará
            as condições individuais e disponibilizará o contrato definitivo após aprovação.
          </p>
          <a
            href="/documentos/EducART_Contrato_Oficina_de_Atores_MINUTA.pdf"
            download="EducART_Contrato_Oficina_de_Atores_MINUTA.pdf"
            className="btn btn-outline btn-lg"
          >
            ↓ Baixar minuta do contrato (PDF · 5 páginas)
          </a>
        </section>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '20px 0 24px' }}>
          Para conversar com a coordenação sobre as condições e os próximos passos, toque no botão do WhatsApp:
        </p>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-whatsapp btn-lg registration-primary-action"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
          <span>Falar com a Coordenação no WhatsApp • {PHONE_DISPLAY}</span>
        </a>
      </div>
    );
  }

  return (
    <div className="multi-step-form-wrapper" id="formulario-inscricao" data-inscricao-step={step}>
      {/* Barra de Progresso do Formulário */}
      <div className="form-progress-bar" role="progressbar" aria-label="Progresso da inscrição" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3}>
        <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
          <span className="step-circle">1</span>
          <span className="step-label">Objetivo</span>
        </div>
        <div className={`progress-line ${step >= 2 ? 'active' : ''}`} />
        <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
          <span className="step-circle">2</span>
          <span className="step-label">Dados Pessoais</span>
        </div>
        <div className={`progress-line ${step >= 3 ? 'active' : ''}`} />
        <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
          <span className="step-circle">3</span>
          <span className="step-label">Endereço & Envio</span>
        </div>
      </div>

      {errorMessage && (
        <div ref={errorRef} tabIndex={-1} className="form-error-alert" role="alert" style={{ scrollMarginTop: 24 }}>
          ⚠️ {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* ETAPA 1: OBJETIVO E EXPERIÊNCIA */}
        {step === 1 && (
          <fieldset className="form-step-section">
            <div className="step-legend">
              <span className="step-badge">Etapa 1 de 3</span>
              <h3>Seu Objetivo na Oficina de Atores</h3>
              <p>Qual é a sua principal motivação para entrar na Formação de Atores?</p>
            </div>

            {triagem && !editarTriagem && (
              <div className="form-group" role="note" aria-label="Respostas aproveitadas da triagem">
                <p>Já aproveitamos as respostas que você deu na entrada:</p>
                {triagem.objetivoRotulo && <p><strong>Interesse:</strong> {triagem.objetivoRotulo}</p>}
                {triagem.experienciaRotulo && <p><strong>Experiência:</strong> {triagem.experienciaRotulo}</p>}
                {triagem.faixaRotulo && <p><strong>Faixa etária informada:</strong> {triagem.faixaRotulo}. A data de nascimento será confirmada na próxima etapa.</p>}
                {(triagem.objetivoRotulo || triagem.experienciaRotulo) && (
                  <button type="button" className="btn btn-outline" onClick={() => setEditarTriagem(true)}>
                    Alterar respostas da triagem
                  </button>
                )}
              </div>
            )}

            {(!triagem?.objetivoRotulo || editarTriagem) && (
            <div className="form-group">
              <label className="form-label" id="label-objetivo">
                Qual o seu objetivo principal? <span className="req">*</span>
              </label>
              <div className="radio-pill-grid" role="radiogroup" aria-labelledby="label-objetivo">
                {[
                  'Ser Ator/Atriz profissional',
                  'Aprimorar comunicação e oratória',
                  'Desinibição e desenvolvimento pessoal',
                  'Interpretação para TV, Cinema e Câmera',
                  'Outro',
                ].map((item) => (
                  <label
                    key={item}
                    className={`radio-pill-label ${formData.objetivo === item ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="objetivo"
                      value={item}
                      checked={formData.objetivo === item}
                      onChange={(e) => updateField('objetivo', e.target.value)}
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>

              {formData.objetivo === 'Outro' && (
                <div style={{ marginTop: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Especifique o seu objetivo..."
                    value={formData.objetivoOutro}
                    onChange={(e) => updateField('objetivoOutro', e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
            )}

            <div className="form-group">
              {(!triagem?.experienciaRotulo || editarTriagem) && (
              <>
              <label className="form-label" id="label-experiencia">
                Já possui experiência anterior em Teatro, TV ou Cinema? <span className="req">*</span>
              </label>
              <div className="radio-pill-grid radio-pill-inline" role="radiogroup" aria-labelledby="label-experiencia">
                {['Não', 'Sim'].map((opcao) => (
                  <label
                    key={opcao}
                    className={`radio-pill-label ${formData.experienciaPrevia === opcao ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="experienciaPrevia"
                      value={opcao}
                      checked={formData.experienciaPrevia === opcao}
                      onChange={(e) => updateField('experienciaPrevia', e.target.value)}
                    />
                    <span>{opcao}</span>
                  </label>
                ))}
              </div>
              </>
              )}

              {formData.experienciaPrevia === 'Sim' && (
                <div style={{ marginTop: '12px' }}>
                  <label className="form-sublabel" htmlFor="quaisExperiencias">
                    Quais cursos, peças ou trabalhos anteriores? <span className="req">*</span>
                  </label>
                  <textarea
                    id="quaisExperiencias"
                    className="form-textarea"
                    rows={3}
                    placeholder="Descreva brevemente suas experiências cênicas..."
                    value={formData.quaisExperiencias}
                    onChange={(e) => updateField('quaisExperiencias', e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" id="label-comoconheceu">
                Como conheceu a Oficina de Atores Salvador?
              </label>
              <div className="radio-pill-grid" role="radiogroup" aria-labelledby="label-comoconheceu">
                {['Instagram (@oficinadeatores.ssa)', 'Indicação de Amigo/Aluno', 'Google / Pesquisa', 'Outro'].map((canal) => (
                  <label
                    key={canal}
                    className={`radio-pill-label ${formData.comoConheceu === canal ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="comoConheceu"
                      value={canal}
                      checked={formData.comoConheceu === canal}
                      onChange={(e) => updateField('comoConheceu', e.target.value)}
                    />
                    <span>{canal}</span>
                  </label>
                ))}
              </div>
              {formData.comoConheceu === 'Outro' && (
                <div style={{ marginTop: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Como nos conheceu?"
                    value={formData.comoConheceuOutro}
                    onChange={(e) => updateField('comoConheceuOutro', e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="form-actions right">
              <button type="button" onClick={handleNextStep} className="btn btn-primary btn-lg">
                <span>Avançar para Dados Pessoais →</span>
              </button>
            </div>
          </fieldset>
        )}

        {/* ETAPA 2: DADOS PESSOAIS E CONTATO */}
        {step === 2 && (
          <fieldset className="form-step-section">
            <div className="step-legend">
              <span className="step-badge">Etapa 2 de 3</span>
              <h3>Seus Dados Pessoais</h3>
              <p>Informações para registro de matrícula e contato direto da coordenação.</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="nomeCompleto">
                Nome Completo: <span className="req">*</span>
              </label>
              <input
                id="nomeCompleto"
                type="text"
                className="form-input"
                placeholder="Ex: João da Silva"
                value={formData.nomeCompleto}
                onChange={(e) => updateField('nomeCompleto', e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="dataNascimento">
                  Data de Nascimento: <span className="req">*</span>
                </label>
                <input
                  id="dataNascimento"
                  type="date"
                  className="form-input"
                  value={formData.dataNascimento}
                  onChange={(e) => updateField('dataNascimento', e.target.value)}
                  required
                />
                <span className="form-hint">Turma adulta: idade mínima obrigatória de 14 anos completos.</span>
                {naoElegivel && <p className="form-error-alert" role="alert">A turma atual é destinada a participantes com pelo menos 14 anos. Não é possível continuar a inscrição com esta data de nascimento.</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="telefone">
                  Telefone / WhatsApp: <span className="req">*</span>
                </label>
                <input
                  id="telefone"
                  type="tel"
                  className="form-input"
                  placeholder="(71) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => updateField('telefone', e.target.value)}
                  required
                />
                <span className="form-hint">Preferencialmente com WhatsApp ativo</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                E-mail Principal: <span className="req">*</span>
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="seuemail@exemplo.com"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                required
              />
              <span className="form-hint">Enviaremos a confirmação para esta caixa postal</span>
            </div>

            <div className="form-actions space-between">
              <button type="button" onClick={prevStep} className="btn btn-outline">
                ← Voltar
              </button>
              <button type="button" onClick={handleNextStep} className="btn btn-primary btn-lg" disabled={naoElegivel}>
                <span>Avançar para Endereço →</span>
              </button>
            </div>
          </fieldset>
        )}

        {/* ETAPA 3: LOCALIZAÇÃO, VALORES E ENVIO */}
        {step === 3 && (
          <fieldset className="form-step-section">
            <div className="step-legend">
              <span className="step-badge">Etapa 3 de 3</span>
              <h3>Localização e envio da inscrição</h3>
              <p>Confirme seus dados de localização para enviar sua ficha. A inscrição não garante vaga nem efetiva matrícula.</p>
            </div>

            <div className="form-group">
              <label className="form-label" id="label-cidade">
                Cidade e Estado: <span className="req">*</span>
              </label>
              <div className="radio-pill-grid" role="radiogroup" aria-labelledby="label-cidade">
                {[
                  'Salvador/BA',
                  'Lauro de Freitas/BA',
                  'Camaçari/BA',
                  'Simões Filho/BA',
                  'Outro',
                ].map((cid) => (
                  <label
                    key={cid}
                    className={`radio-pill-label ${formData.cidadeEstado === cid ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="cidadeEstado"
                      value={cid}
                      checked={formData.cidadeEstado === cid}
                      onChange={(e) => updateField('cidadeEstado', e.target.value)}
                    />
                    <span>{cid}</span>
                  </label>
                ))}
              </div>

              {formData.cidadeEstado === 'Outro' && (
                <div style={{ marginTop: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Informe sua Cidade e Estado (ex: Feira de Santana/BA)"
                    value={formData.cidadeEstadoOutro}
                    onChange={(e) => updateField('cidadeEstadoOutro', e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="endereco">
                Endereço Completo: <span className="req">*</span>
              </label>
              <input
                id="endereco"
                type="text"
                className="form-input"
                placeholder="Rua, número, complemento e BAIRRO"
                value={formData.endereco}
                onChange={(e) => updateField('endereco', e.target.value)}
                required
              />
              <span className="form-hint">*Importante incluir o nome do bairro</span>
            </div>

            {/* Informações Transparentes de Investimento */}
            <div className="investment-notice-card registration-details">
              <div className="notice-header">
                <span>🎭 Detalhes da Formação de Atores</span>
              </div>

              <div className="registration-details-grid">
                <div className="registration-detail">
                  <span className="registration-detail-label">Horário</span>
                  <strong className="registration-detail-value">{HORARIO_TURMA_FORMACAO}</strong>
                </div>
                <div className="registration-detail">
                  <span className="registration-detail-label">Investimento</span>
                  <strong className="registration-detail-value">Matrícula: R$ 50 · Mensalidade: R$ 320</strong>
                  <span className="registration-detail-note">Valores de referência. Confirme as condições atuais com a coordenação.</span>
                </div>
            <div className="registration-detail registration-detail-place">
              <span className="registration-detail-label">Local das aulas</span>
              <strong className="registration-detail-value">{NOME_LOCAL_FORMACAO}</strong>
              <CasaGameleiraLink />
            </div>
              </div>
              <p className="registration-privacy-note">
                Ao enviar a ficha, seus dados serão registrados para que a equipe do curso possa entrar em contato pelo WhatsApp.
              </p>
            </div>

            <div className="form-actions space-between registration-form-actions">
              <button type="button" onClick={prevStep} className="btn btn-outline" disabled={isSubmitting}>
                ← Voltar
              </button>
              <button type="submit" className="btn btn-whatsapp btn-lg registration-primary-action" disabled={isSubmitting}>
                {isSubmitting ? 'Registrando Inscrição...' : '✓ Finalizar e Confirmar Inscrição'}
              </button>
            </div>
          </fieldset>
        )}
      </form>
    </div>
  );
}

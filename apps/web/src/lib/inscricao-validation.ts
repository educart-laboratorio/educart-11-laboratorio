import { calcularIdade, IDADE_MINIMA_FORMACAO } from './idade-formacao';
import { CAMPANHA_FORMACAO_ATUAL } from './campanhas';

export interface InscricaoFormData {
  objetivo: string;
  objetivoOutro: string;
  dataNascimento: string;
  nomeCompleto: string;
  endereco: string;
  cidadeEstado: string;
  cidadeEstadoOutro: string;
  telefone: string;
  email: string;
  experienciaPrevia: string;
  quaisExperiencias: string;
  comoConheceu: string;
  comoConheceuOutro: string;
}

export interface ValidationResult {
  valid: boolean;
  errorMessage: string;
}

export function validateStep(currentStep: number, formData: InscricaoFormData): ValidationResult {
  // A checagem se repete no envio final. Não basta restringir o fluxo visual.
  if (currentStep === 2 || currentStep === 3) {
    if (!formData.dataNascimento) {
      return { valid: false, errorMessage: 'Por favor, informe sua data de nascimento.' };
    }
    const idade = calcularIdade(formData.dataNascimento);
    if (idade === null || idade < 0) {
      return { valid: false, errorMessage: 'Informe uma data de nascimento válida.' };
    }
    if (idade < IDADE_MINIMA_FORMACAO) {
      return { valid: false, errorMessage: 'Esta turma adulta aceita inscrições a partir dos 14 anos completos. Não é possível prosseguir com essa idade.' };
    }
  }
  if (currentStep === 1) {
    if (!formData.objetivo || !formData.objetivo.trim()) {
      return { valid: false, errorMessage: 'Por favor, selecione o seu objetivo.' };
    }
    if (formData.objetivo === 'Outro' && !formData.objetivoOutro.trim()) {
      return { valid: false, errorMessage: 'Por favor, especifique o seu objetivo no campo Outro.' };
    }
    if (formData.experienciaPrevia === 'Sim' && !formData.quaisExperiencias.trim()) {
      return { valid: false, errorMessage: 'Por favor, informe brevemente seus cursos ou trabalhos anteriores.' };
    }
  }

  if (currentStep === 2) {
    if (!formData.nomeCompleto.trim()) {
      return { valid: false, errorMessage: 'Por favor, informe seu nome completo.' };
    }
    if (!formData.dataNascimento) {
      return { valid: false, errorMessage: 'Por favor, informe sua data de nascimento.' };
    }
    const cleanPhone = formData.telefone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return { valid: false, errorMessage: 'Por favor, informe um telefone/WhatsApp válido com DDD.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      return { valid: false, errorMessage: 'Por favor, informe um endereço de e-mail válido.' };
    }
  }

  if (currentStep === 3) {
    if (!formData.endereco.trim()) {
      return { valid: false, errorMessage: 'Por favor, informe seu endereço completo (incluindo o bairro).' };
    }
    if (formData.cidadeEstado === 'Outro' && !formData.cidadeEstadoOutro.trim()) {
      return { valid: false, errorMessage: 'Por favor, especifique sua Cidade e Estado.' };
    }
  }

  return { valid: true, errorMessage: '' };
}

export function buildInscricaoPayload(formData: InscricaoFormData) {
  const finalObjetivo = formData.objetivo === 'Outro' ? formData.objetivoOutro.trim() : formData.objetivo;
  const finalCidade = formData.cidadeEstado === 'Outro' ? formData.cidadeEstadoOutro.trim() : formData.cidadeEstado;
  const finalComoConheceu = formData.comoConheceu === 'Outro' ? formData.comoConheceuOutro.trim() : formData.comoConheceu;

  return {
    nome_completo: formData.nomeCompleto.trim(),
    data_nascimento: formData.dataNascimento,
    telefone_whatsapp: formData.telefone.trim(),
    email: formData.email.trim().toLowerCase(),
    endereco_bairro: formData.endereco.trim(),
    cidade_estado: finalCidade,
    objetivo: finalObjetivo,
    experiencia_previa: formData.experienciaPrevia === 'Sim',
    quais_experiencias: formData.quaisExperiencias?.trim() || null,
    como_conheceu: finalComoConheceu,
    turma_campanha: CAMPANHA_FORMACAO_ATUAL,
    origem: 'Portal EducART (educart.pro)',
    created_at: new Date().toISOString(),
  };
}

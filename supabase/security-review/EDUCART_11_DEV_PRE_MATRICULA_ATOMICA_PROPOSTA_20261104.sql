-- AutoDEV / EducART 1.1 — APLICADA SOMENTE EM DATABASE-DEV, NUNCA PRODUÇÃO.
-- Situação confirmada em 04/11/2026: migração 20261104210036
-- educart_11_pre_matricula_atomica_dev_pendente_20261104
-- no projeto esjrjzyvyhtzwgihcbsc. NÃO REAPLICAR NO DEV.
-- Cópia para auditoria (fora das migrations genéricas); sem dados modificados.
-- Código e função compilados, E2E autenticado ainda PENDENTE.
-- Preparar pré-matrícula NÃO comprova pagamento, NÃO ativa matrícula,
-- NÃO publica perfil e NÃO modifica inscrições nem valores financeiros.
--
-- Segurança:
-- * SECURITY INVOKER: RLS existente continua aplicável a cada tabela.
-- * Só membros de portal_admins COM equipe_papeis.coordenacao podem chamar.
-- * Trava transacional de turma para controlar capacidade entre chamadas RPC.
-- * Erro revertendo toda a transação: nenhuma pessoa órfã.
-- * Unicidade candidatura_id e (pessoa_id,turma_id) preservada.
-- * Pessoa existente requer seleção EXPLÍCITA + conferência de identidade.
--
-- ATENÇÃO: ainda requer teste E2E autenticado e revisão de política
-- de importação de alunos antigos; não oficializar a 1.1.

create or replace function public.educart_pre_matricular_dev(
  p_candidatura_id uuid,
  p_turma_id uuid,
  p_pessoa_existente_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid;
  v_candidatura public.inscricoes_oficina%rowtype;
  v_turma public.turmas%rowtype;
  v_pessoa public.pessoas%rowtype;
  v_pessoa_id uuid;
  v_matricula_id uuid;
  v_ocupacao integer;
  v_email text;
  v_telefone text;
begin
  v_uid := auth.uid();
  if v_uid is null or not exists (
    select 1 from public.portal_admins a where a.user_id = v_uid
  ) or not exists (
    select 1 from public.equipe_papeis p
    where p.user_id = v_uid and p.papel = 'coordenacao'
  ) then
    raise exception 'Acesso restrito a Coordenação autorizada' using errcode='42501';
  end if;

  if p_candidatura_id is null or p_turma_id is null then
    raise exception 'Selecione candidatura e turma' using errcode='22023';
  end if;

  -- Bloqueia a turma durante o cálculo de vagas para serializar chamadas RPC.
  select * into v_turma from public.turmas
    where id = p_turma_id for update;
  if not found then
    raise exception 'Turma indisponível' using errcode='P0002';
  end if;
  if v_turma.situacao not in ('planejada','aberta','em_andamento') then
    raise exception 'Turma não aceita novas pré-matrículas' using errcode='22023';
  end if;

  select * into v_candidatura from public.inscricoes_oficina
    where id = p_candidatura_id for update;
  if not found or v_candidatura.status = 'cancelado' then
    raise exception 'Candidatura inexistente ou cancelada' using errcode='22023';
  end if;

  if exists(select 1 from public.matriculas where candidatura_id = p_candidatura_id) then
    raise exception 'Esta candidatura já possui vínculo de matrícula' using errcode='23505';
  end if;

  select count(*) into v_ocupacao
    from public.matriculas m
    where m.turma_id = p_turma_id and m.situacao in ('pendente', 'ativa');
  if v_turma.capacidade is not null and v_ocupacao >= v_turma.capacidade then
    raise exception 'Turma sem vagas para pré-matrícula' using errcode='23514';
  end if;

  v_email := lower(btrim(coalesce(v_candidatura.email,'')));
  v_telefone := regexp_replace(coalesce(v_candidatura.telefone_whatsapp,''),'[^0-9]','','g');

  -- Serializa a reconciliação de identidades em chamadas desta RPC.
  -- Proteção conservadora contra duas candidaturas simultâneas criando
  -- duas pessoas para o mesmo email/telefone. Não substitui unicidade
  -- global para outras rotas de INSERT (auditar antes do release).
  perform pg_advisory_xact_lock(hashtextextended('educart-dev-reconciliacao-pessoas', 0));

  if p_pessoa_existente_id is not null then
    select * into v_pessoa from public.pessoas
      where id = p_pessoa_existente_id for update;
    if not found then
      raise exception 'Pessoa indicada não encontrada' using errcode='22023';
    end if;
    -- Exige nome e ao menos um identificador coincidente, além de
    -- não permitir nascimento contraditório. Casos ambíguos exigem revisão.
    if lower(btrim(v_pessoa.nome_completo)) <> lower(btrim(v_candidatura.nome_completo))
       or (v_pessoa.data_nascimento is not null and
           v_pessoa.data_nascimento <> v_candidatura.data_nascimento)
       or not (
         (v_email <> '' and lower(btrim(coalesce(v_pessoa.email,''))) = v_email)
         or (v_telefone <> '' and
             regexp_replace(coalesce(v_pessoa.telefone,''),'[^0-9]','','g') = v_telefone)
       ) then
      raise exception 'Identificação divergente: revisar cadastro manualmente' using errcode='22023';
    end if;
    v_pessoa_id := v_pessoa.id;
  else
    -- Bloqueio conservador: nunca criar nova pessoa diante de
    -- qualquer possível coincidência em email ou telefone.
    if exists (
      select 1 from public.pessoas p
      where (v_email <> '' and lower(btrim(coalesce(p.email,''))) = v_email)
         or (v_telefone <> '' and
             regexp_replace(coalesce(p.telefone,''),'[^0-9]','','g') = v_telefone)
    ) then
      raise exception 'Pessoa possivelmente existente: selecione cadastro compatível' using errcode='23505';
    end if;
    insert into public.pessoas (
      nome_completo,email,telefone,data_nascimento,cidade,bairro
    ) values (
      v_candidatura.nome_completo,v_candidatura.email,
      v_candidatura.telefone_whatsapp,v_candidatura.data_nascimento,
      v_candidatura.cidade_estado,v_candidatura.endereco_bairro
    ) returning id into v_pessoa_id;
  end if;

  -- Obrigatoriamente PENDENTE. Nunca define ativa, matriculado, pago,
  -- confirmado_por ou qualquer tipo de autorização de perfil.
  insert into public.matriculas(
    pessoa_id,turma_id,candidatura_id,origem,situacao
  ) values (
    v_pessoa_id,p_turma_id,p_candidatura_id,'novo','pendente'
  ) returning id into v_matricula_id;
  return v_matricula_id;
end;
$$;

revoke all on function public.educart_pre_matricular_dev(uuid,uuid,uuid)
  from public, anon;
grant execute on function public.educart_pre_matricular_dev(uuid,uuid,uuid)
  to authenticated;

comment on function public.educart_pre_matricular_dev(uuid,uuid,uuid) is
 'EducART 1.1 DEV — pré-matrícula atômica pendente, sem pagamento nem ativação.';

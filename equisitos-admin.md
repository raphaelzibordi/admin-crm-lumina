# 📋 Lumina CRM — Documento de Requisitos para Painel Administrativo (Admin)

**Versão:** 1.0  
**Data:** Junho 2026  
**Objetivo:** Especificação técnica e funcional do painel administrativo para gestão centralizada do Lumina CRM, com foco em sincronização de dados, permissões/ACLs e impactos no sistema CRM principal.

**Público-alvo:** Desenvolvedor Staff (Full-Stack)  
**Escopo:** Requisitos funcionais, fluxos de dados, matriz de permissões, diagramas de sincronização. *Não inclui especificações de endpoints/APIs (mapeamento a cargo do desenvolvedor).*

---

## 📑 Índice

1. [Visão Geral & Contexto](#1-visão-geral--contexto)
2. [Arquitetura de Permissões e ACLs](#2-arquitetura-de-permissões-e-acls)
3. [Módulo 1: Gestão de Usuários & Equipe](#3-módulo-1-gestão-de-usuários--equipe)
4. [Módulo 2: Configurações da Clínica](#4-módulo-2-configurações-da-clínica)
5. [Módulo 3: Gestão de Procedimentos & Tabela de Preços](#5-módulo-3-gestão-de-procedimentos--tabela-de-preços)
6. [Módulo 4: Gestão de Salas & Infraestrutura](#6-módulo-4-gestão-de-salas--infraestrutura)
7. [Módulo 5: Configurações Financeiras & Comissões](#7-módulo-5-configurações-financeiras--comissões)
8. [Módulo 6: Templates de Mensagens & Comunicação](#8-módulo-6-templates-de-mensagens--comunicação)
9. [Fluxos de Sincronização de Dados (Admin ↔ CRM)](#9-fluxos-de-sincronização-de-dados-admin--crm)
10. [Matriz de Impactos no CRM](#10-matriz-de-impactos-no-crm)
11. [Resumo do MVP vs. Full Product](#11-resumo-do-mvp-vs-full-product)

---

## 1. Visão Geral & Contexto

### 1.1 Objetivo do Painel Admin

O Painel Administrativo (Admin) é a **base de configuração centralizada** do Lumina CRM. Todas as definições, políticas, estruturas e parâmetros operacionais da clínica são gerenciadas no Admin e **sincronizadas em tempo real** para o CRM principal, garantindo que qualquer alteração impacte imediatamente a experiência dos usuários (recepcionistas, profissionais, gerentes).

**Casos de uso principais:**
- Um dono de clínica (role: `dono`) acessa o Admin para configurar equipe, procedimentos, preços e regras operacionais
- Membros da equipe (role: `equipe`) acessam o Admin com permissões **limitadas e específicas** (ex: visualização de tabela de preços, mas não alteração)
- Alterações no Admin desencadeiam **sincronizações automáticas** que atualizam o CRM em tempo real

### 1.2 Fluxo de Autorização (AuthN/AuthZ)

```
┌─────────────────┐
│   Login Supabase│ (JWT)
│   + Role Detect │
└────────┬────────┘
         │
         ▼
   ┌─────────────────────────────────────┐
   │ Role Enum:                          │
   │ - 'dono' (Dono da clínica)          │
   │ - 'equipe' (Membro da equipe)       │
   │ - [future] 'gerente', 'financeiro'  │
   └────────┬────────────────────────────┘
            │
       ┌────┴──────────────────────────────────────┐
       │                                           │
   DONO (Full Access)              EQUIPE (Restricted)
   ├─ Gestão de usuários           ├─ Visualizar tabela de preços
   ├─ Configurações da clínica     ├─ Visualizar procedimentos
   ├─ Procedimentos & preços       ├─ Visualizar salas
   ├─ Salas & infraestrutura       ├─ Visualizar equipe (read-only)
   ├─ Permissões financeiras       └─ [LIMITED] Editar perfil pessoal
   ├─ Templates de mensagens
   └─ Logs de auditoria (auditor)
```

---

## 2. Arquitetura de Permissões e ACLs

### 2.1 Modelo de Acesso Baseado em Tenant

O Lumina opera no modelo **Multi-Tenant Single-Database** com **Row-Level Security (RLS)** do Supabase:

```sql
-- Cada record em qualquer tabela pertence a um tenant (user_id)
-- Membros da equipe são mapeados para o owner_id do dono
-- A função get_tenant_id() resolve o tenant efetivo para RLS

CREATE POLICY "usuarios_select" ON public.usuarios
  FOR SELECT USING (id = public.get_tenant_id());

CREATE POLICY "clientes_all" ON public.clientes
  FOR ALL USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());
```

**Implicação:** Não é possível um usuário ver ou modificar dados de outro tenant, mesmo que haja acesso ao Admin.

### 2.2 Matriz de Permissões (ACL Básica)

| Funcionalidade | Dono | Equipe | Notas |
|---|:---:|:---:|---|
| **Gestão de Usuários** | ✅ | ❌ | Apenas o dono cria/remove/altera membros da equipe |
| **Perfil Pessoal (Próprio)** | ✅ | ✅ | Ambos podem editar seus próprios dados |
| **Configurações da Clínica** | ✅ | 🔍 | Dono edita; equipe visualiza (read-only) |
| **Procedimentos & Preços** | ✅ | 🔍 | Dono edita; equipe visualiza (read-only) |
| **Salas & Infraestrutura** | ✅ | 🔍 | Dono edita; equipe visualiza (read-only) |
| **Comissões & Financeiro** | ✅ | ❌ | Apenas o dono altera regras financeiras |
| **Templates de Mensagens** | ✅ | 🔍 | Dono edita; equipe visualiza (read-only) |
| **Logs de Auditoria** | ✅ | ❌ | Apenas o dono (e futuros auditores) acessam |

**Legenda:**
- ✅ = Acesso completo (CRUD)
- 🔍 = Leitura apenas (Read-only)
- ❌ = Sem acesso

### 2.3 Fluxo de Detecção de Role no Login

```
┌────────────────────────────────────────────────────────┐
│  Usuário insere e-mail + senha → Supabase Auth         │
└────────────┬───────────────────────────────────────────┘
             │
             ▼
   ┌──────────────────────────────────────┐
   │ handle_new_user() (trigger)          │
   │                                      │
   │ 1. Consulta tabela equipe:           │
   │    WHERE email = user.email          │
   │    AND ativo = true                  │
   └────────┬──────────────────────────────┘
            │
        ┌───┴──────────────────────────┐
        │                              │
   Email encontrado         Email NÃO encontrado
   em equipe?               em equipe?
        │                              │
        ▼                              ▼
   role = 'equipe'          role = 'dono'
   owner_id = <dono_id>     owner_id = NULL
   (vinculado a dono)       (novo tenant)
```

**Caso especial:** Se a equipe foi cadastrada antes do usuário criar a conta (pré-cadastro), o trigger automaticamente já define `role='equipe'` na primeira autenticação.

### 2.4 Função de Auto-Recuperação (resolve_equipe_owner)

Caso o `role` ou `owner_id` fique incoerente (ex: por falha de trigger), a função `resolve_equipe_owner()` é chamada no backend sempre que há uma ação autenticada. Ela:

1. Consulta `auth.users` para recuperar o e-mail do usuário
2. Busca na tabela `equipe` se esse e-mail está pré-cadastrado
3. Se encontrado, **corrige in-place** o record em `usuarios` (role, owner_id)

Garante consistência mesmo após falhas.

---

## 3. Módulo 1: Gestão de Usuários & Equipe

### 3.1 Requisitos Funcionais

#### 3.1.1 Listar Membros da Equipe
**Quem pode:** Dono (✅), Equipe (🔍 - view-only)

**Descrição:**  
Exibe uma tabela com todos os membros cadastrados na equipe da clínica.

**Dados exibidos por membro:**
- ID único (UUID)
- Nome completo
- E-mail
- Cargo/especialidade (ex: "Esteticista", "Médica")
- Foto de perfil (thumbnail)
- Status ativo/inativo
- Data de criação

**Funcionalidades complementares:**
- Busca por nome ou e-mail
- Filtro por status (ativo / inativo)
- Paginação (10, 25, 50 itens por página)
- Ação [Editar] (dono apenas)
- Ação [Desativar/Reativar] (dono apenas)
- Ação [Deletar] com confirmação (dono apenas)

---

#### 3.1.2 Criar Novo Membro da Equipe
**Quem pode:** Dono (✅)

**Descrição:**  
Formulário para adicionar um novo profissional à clínica. O novo membro recebe um e-mail de convite com instruções para criar sua conta.

**Campos obrigatórios:**
- Nome completo
- E-mail (validação de formato; será enviado convite)
- Cargo/Especialidade (select ou texto livre)

**Campos opcionais:**
- Foto de perfil (upload ou URL)
- Descrição/Bio (ex: "Especialista em Botox")

**Fluxo:**
```
┌────────────────────────────────┐
│ Admin: Criar novo membro       │
│ Preenche: nome, email, cargo   │
└────────┬────────────────────────┘
         │
         ▼
    ┌─────────────────────────────┐
    │ 1. Insere em tabela equipe   │
    │    user_id = dono_id        │
    │    email = <informado>      │
    │    ativo = true             │
    └─────────┬───────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │ 2. Envia e-mail de convite  │
    │    (via SendGrid/Resend)    │
    │    com link de signup       │
    └─────────┬───────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │ 3. Quando membro clica no   │
    │    link e cria conta:       │
    │    - auth.users é criado    │
    │    - handle_new_user()      │
    │      detecta role='equipe'  │
    │      via email match        │
    └─────────────────────────────┘
```

**Impacto no CRM:**
- Novo membro aparece na lista de profissionais ao criar agendamentos
- Automaticamente pode acessar o CRM com permissões restritas
- Seus dados (nome, cargo, foto) são consumidos pela agenda inteligente e jornada do cliente

---

#### 3.1.3 Editar Membro da Equipe
**Quem pode:** Dono (✅)

**Descrição:**  
Permite atualizar informações de um membro já cadastrado.

**Campos editáveis:**
- Nome
- Cargo
- Foto
- Bio/Descrição
- Status (ativo/inativo)

**Validações:**
- E-mail não pode ser alterado (é a chave de identidade no Supabase)
- Se desativar um membro, seus agendamentos futuros não são apagados, mas ele não pode ser selecionado para novos agendamentos

**Impacto no CRM:**
- Se nome ou foto mudam, a agenda inteligente é **re-renderizada em tempo real**
- Clientes conseguem visualizar a foto atualizada do profissional

---

#### 3.1.4 Perfil Pessoal (Self-Service)
**Quem pode:** Qualquer usuário (dono ou equipe) — sobre seus próprios dados

**Descrição:**  
Cada usuário pode editar suas próprias informações pessoais (nome, telefone, foto, data de nascimento).

**Campos editáveis:**
- Nome pessoal
- Telefone pessoal
- Data de nascimento
- Foto de perfil

**Impacto no CRM:**
- Mudança em nome/foto do dono afeta a exibição do nome da clínica (se sincronizado)
- Mudança em dados de equipe afeta apenas a exibição pessoal em relatórios

---

### 3.2 Fluxo de Sincronização (Gestão de Usuários → CRM)

```
┌──────────────────────────────────────────────┐
│  ADMIN: Insere/atualiza membro               │
│         (name, email, cargo, foto_url)       │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │ Trigger: on_equipe_update (AFTER)    │
    │                                      │
    │ INSERT/UPDATE na tabela equipe       │
    │ → Notifica aplicação via realtime    │
    │ → Aplicação consome webhook          │
    │   (ou simples polling via SDK)       │
    └──────────────────┬───────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────┐
    │ CRM: Recebe atualização em tempo     │
    │      real (Supabase Realtime)        │
    │                                      │
    │ 1. Agenda Inteligente:               │
    │    - Re-renderiza disponibilidade    │
    │    - Mostra foto nova do prof.      │
    │                                      │
    │ 2. Jornada do Cliente:               │
    │    - Atualiza nome do prof. visível  │
    │      na Jornada (Kanban)             │
    │                                      │
    │ 3. Prontuário:                       │
    │    - Se mudar foto/nome, refletiré   │
    │      em históricos de consultas      │
    └──────────────────────────────────────┘
```

**Detalhes técnicos:**
- Tabela `equipe` é observada via RLS policies
- Supabase Realtime emite eventos `UPDATE` quando um record é alterado
- Cliente (CRM) pode se inscrever em mudanças da tabela com `.on('postgres_changes', ...)`
- Latência típica: < 100ms (mesmo datacenter)

---

## 4. Módulo 2: Configurações da Clínica

### 4.1 Requisitos Funcionais

#### 4.1.1 Editar Dados Básicos da Clínica
**Quem pode:** Dono (✅)

**Descrição:**  
Gerencia informações de identificação e contato da clínica.

**Campos:**
- Nome da clínica
- Telefone/WhatsApp principal
- Endereço completo (rua, número, complemento, cidade, estado)
- CEP
- E-mail de contato
- Website (opcional)
- Rede social (Instagram, Facebook) — opcionais

**Validações:**
- Nome não pode estar vazio
- Telefone segue formato brasileiro (11)99999-9999
- CEP válido (lookup contra API pública)
- E-mail válido

**Impacto no CRM:**
- Nome da clínica aparece no header/footer de páginas públicas
- Telefone é usado para links de WhatsApp compartilhados
- Endereço aparece em formulários de pre-cadastro de pacientes
- Redes sociais aparecem em footers públicos (se feature de landing pages implementada)

---

#### 4.1.2 Horário de Funcionamento
**Quem pode:** Dono (✅)

**Descrição:**  
Define os horários em que a clínica está aberta em cada dia da semana.

**Dados por dia:**
- Dia da semana (seg-dom)
- Horário de abertura (HH:MM)
- Horário de fechamento (HH:MM)
- Status (aberto/fechado) — permite fechar um dia inteiro sem preencher horários

**Funcionalidades complementares:**
- "Copiar da semana anterior" (bulk apply)
- Exceções (feriados, dias especiais com horário diferente)

**Impacto no CRM:**
- Agenda inteligente **bloqueia automaticamente** horários fora do funcionamento da clínica
- Se um membro tenta agendar para fora do horário, erro: *"Agendamento fora do horário de funcionamento"*
- Agendamento online (quando implementado) não permitirá datas/horários fechados

---

#### 4.1.3 Gerenciar Períodos Fechados (Recesso, Feriados)
**Quem pode:** Dono (✅)

**Descrição:**  
Permite marcar datas em que a clínica está completamente fechada (recesso, feriado, manutenção).

**Campos:**
- Data de início (YYYY-MM-DD)
- Data de fim (YYYY-MM-DD)
- Motivo (texto livre)

**Funcionalidades:**
- Listar períodos fechados
- Editar intervalo e motivo
- Deletar período

**Impacto no CRM:**
- Agenda inteligente **rejeita agendamentos** em datas marcadas como fechadas
- Mensagem de aviso: *"Clínica fechada entre [data_ini] e [data_fim]. Próximo atendimento disponível em [data]"*

---

### 4.2 Fluxo de Sincronização (Configurações → CRM)

```
┌──────────────────────────────────────────┐
│ ADMIN: Atualiza horário de funcionamento │
│        (muda abertura de 09:00 → 10:00)  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │ Trigger: on_clinica_config_update    │
    │          (AFTER INSERT/UPDATE)       │
    │                                      │
    │ Update tabela usuarios (field:       │
    │ horario_abertura, horario_fechamento)│
    │ → Emite via Realtime                 │
    └──────────────────┬────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────┐
    │ CRM: Agenda recebe evento             │
    │                                      │
    │ 1. Re-calcula disponibilidades       │
    │    (algoritmo encaixe inteligente)   │
    │                                      │
    │ 2. Bloqueia horários fora do         │
    │    funcionamento                     │
    │                                      │
    │ 3. Valida agendamentos existentes:   │
    │    - Se algum agendamento ficou      │
    │      fora do novo horário → aviso    │
    │      (manual review necessário)      │
    └──────────────────────────────────────┘
```

---

## 5. Módulo 3: Gestão de Procedimentos & Tabela de Preços

### 5.1 Requisitos Funcionais

#### 5.1.1 Listar Procedimentos
**Quem pode:** Dono (✅), Equipe (🔍)

**Descrição:**  
Tabela com todos os procedimentos/tratamentos oferecidos pela clínica.

**Colunas:**
- ID / Código (UUID ou custom)
- Nome do procedimento
- Descrição curta
- Preço (R$)
- Duração (minutos)
- Validade (dias) — se aplicável a pacotes
- Status (ativo/inativo)
- Ações [Ver] [Editar] [Deletar]

**Funcionalidades:**
- Busca por nome
- Filtro por status
- Paginação
- Bulk actions (ativar/desativar vários)

---

#### 5.1.2 Criar Novo Procedimento
**Quem pode:** Dono (✅)

**Descrição:**  
Adiciona um novo serviço à tabela de preços.

**Campos obrigatórios:**
- Nome (ex: "Botox Frontal")
- Descrição (ex: "Aplicação de Toxina Botulínica na região frontal")
- Preço base (R$)
- Duração em minutos

**Campos opcionais:**
- Categoria (select: Injeção, Laser, Radiofrequência, Estética, etc.)
- Observações internas (ex: "Usa insumo ABC")
- Foto/ícone do procedimento
- Profissionais que podem executar (multi-select)
- Salas necessárias (multi-select)
- Validade em dias (se for pacote)

**Lógica:**
- Procedimento nasce com `ativo=true`
- Automaticamente semeia um record em `templates_mensagens` com templates padrão pós-procedimento

**Impacto no CRM:**
- Aparece imediatamente na lista de dropdown ao criar agendamento
- Agenda inteligente usa duração para calcular brechas
- Faturamento consome preço ao fazer checkout
- Possibilita criação de anamnese customizada por procedimento (quando implementado)

---

#### 5.1.3 Editar Procedimento
**Quem pode:** Dono (✅)

**Descrição:**  
Altera preço, duração, descrição, status e outros atributos.

**Validações:**
- Se mudou o preço, alertar: *"Alteração em vigor para futuros agendamentos. Agendamentos existentes mantêm preço histórico"*
- Duração deve ser > 0 e < 480 (máx 8h)

**Impacto no CRM:**
- Se preço muda, novos agendamentos usam novo preço (transparência)
- Históricos de faturamento mantêm o preço original (auditoria)
- Se duração muda, agenda re-calcula brechas para novos agendamentos

---

#### 5.1.4 Tabela de Preços Customizadas (Desconto por Volume)
**Quem pode:** Dono (✅)  
**Status MVP:** ❌ (Fase 2 - Full Product)

**Descrição:**  
Permite criar variações de preço baseadas em quantidade ou pacotes.

**Exemplo:**
- Procedimento "Botox Frontal" base = R$ 300
- Pacote 4 sessões = R$ 1.100 (desconto 8%)
- Pacote 8 sessões = R$ 2.000 (desconto 17%)

**Campos:**
- Nome do pacote
- Quantidade de sessões
- Preço total
- Data de validade (quando expira o pacote)

**Impacto no CRM:**
- Ao agendar, sistema oferece opção de usar crédito de pacote
- Faturamento desconta automaticamente do saldo de créditos
- Relatório de contas a receber consolida pacotes vendidos vs. utilizados

---

### 5.2 Fluxo de Sincronização (Procedimentos → CRM)

```
┌──────────────────────────────────────────┐
│ ADMIN: Insere novo procedimento          │
│        "Botox Frontal" (R$ 300, 30min)   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │ Insert em tabela procedimentos        │
    │ + Insert em templates_mensagens      │
    │   (templates pós-procedimento)       │
    │                                      │
    │ → Realtime event emitido             │
    └──────────────────┬────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────┐
    │ CRM: Recebe novo procedimento         │
    │                                      │
    │ 1. Agenda Inteligente:               │
    │    - Adiciona à lista de dropdown    │
    │    - Usa duração (30min) para        │
    │      calcular disponibilidades       │
    │                                      │
    │ 2. Faturamento:                      │
    │    - Disponibiliza para seleção      │
    │      ao fazer checkout               │
    │    - Usa preço (R$ 300) base         │
    │                                      │
    │ 3. Prontuário:                       │
    │    - Cria anamnese customizada       │
    │      para este procedimento          │
    │                                      │
    │ 4. Automação (futuro):               │
    │    - Dispara template pós-aplic.     │
    │      via WhatsApp em T+24h           │
    └──────────────────────────────────────┘
```

**Fluxo detalhado de preço alterado:**

```
┌──────────────────────────────────────────┐
│ ADMIN: Alerta preço de Botox             │
│        R$ 300 → R$ 350                   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │ Update procedimentos.preco = 350      │
    │ + Insert em audit_procedimentos       │
    │   (log de mudança: who, when, from->to)
    │                                      │
    │ → Realtime event emitido             │
    └──────────────────┬────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────┐
    │ CRM: Faturamento lê novo preço       │
    │                                      │
    │ 1. Novos agendamentos → R$ 350       │
    │                                      │
    │ 2. Agendamentos existentes (não      │
    │    faturados ainda) → opção:         │
    │    a) Manter preço original          │
    │    b) Atualizar para novo preço      │
    │    (decision: recepção)              │
    │                                      │
    │ 3. Agendamentos já faturados:        │
    │    mantêm R$ 300 (histórico)         │
    └──────────────────────────────────────┘
```

---

## 6. Módulo 4: Gestão de Salas & Infraestrutura

### 6.1 Requisitos Funcionais

#### 6.1.1 Listar Salas
**Quem pode:** Dono (✅), Equipe (🔍)

**Descrição:**  
Exibe todas as salas/consultórios/cabines disponíveis na clínica.

**Colunas:**
- ID
- Nome da sala (ex: "Sala 1", "Consultório A")
- Tipo (select: Consultório, Cabine, Sala de Espera, etc.)
- Capacidade (número de pessoas)
- Equipamentos (tags: Laser CO2, Radiofrequência, Maca, etc.)
- Status (ativo/inativo)
- Ações

---

#### 6.1.2 Criar Nova Sala
**Quem pode:** Dono (✅)

**Campos:**
- Nome
- Tipo (select)
- Descrição
- Capacidade
- Equipamentos disponíveis (multi-select com tags)
- Localização no mapa (opcional — se feature de "localizar paciente" implementada)

**Impacto no CRM:**
- Sala fica disponível para seleção ao criar agendamento
- Agenda inteligente pode usar como filtro (ex: "Procedimento X requer Laser CO2")
- Se procedimento requer sala específica, validação bloqueia agendamento em sala inadequada

---

#### 6.1.3 Editar Sala
**Quem pode:** Dono (✅)

**Campos editáveis:** Nome, tipo, descrição, capacidade, equipamentos, status

**Validações:**
- Se desativar uma sala, avisar se há agendamentos futuros nela → opção para remarcá-los

---

#### 6.1.4 Equipamentos (Catálogo Master)
**Quem pode:** Dono (✅)  
**Status MVP:** ❌ (Fase 2)

**Descrição:**  
Gestão centralizada de equipamentos para evitar inconsistências.

**Funcionalidades:**
- Criar novo equipamento (nome, marca, modelo)
- Associar a salas
- Marcar como ativo/inativo
- Gerenciar manutenção preventiva (datas)

---

### 6.2 Fluxo de Sincronização (Salas → CRM)

```
┌──────────────────────────────────────────┐
│ ADMIN: Cria nova sala                    │
│        "Sala Premium" (Laser CO2)        │
└──────────────────┬──────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │ Insert em tabela salas               │
    │ → Realtime event emitido             │
    └──────────────────┬────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────┐
    │ CRM: Agenda Inteligente recebe       │
    │                                      │
    │ 1. Dropdown de salas é atualizado    │
    │                                      │
    │ 2. Se procedimento requer            │
    │    "Laser CO2", a sala "Premium"     │
    │    agora é opção válida              │
    │                                      │
    │ 3. Validação de agendamento:         │
    │    - "Botox pode usar qualquer       │
    │       sala"                          │
    │    - "Laser CO2 requer Sala Premium" │
    │      (validação ativa)               │
    └──────────────────────────────────────┘
```

---

## 7. Módulo 5: Configurações Financeiras & Comissões

### 7.1 Requisitos Funcionais

#### 7.1.1 Configurar Comissão por Profissional
**Quem pode:** Dono (✅)

**Descrição:**  
Define percentual de comissão que cada membro da equipe recebe por procedimento realizado.

**Modelos de comissão:**
1. **% sobre faturamento** (ex: 20% do valor do procedimento)
2. **Valor fixo por procedimento** (ex: R$ 50 por Botox)
3. **Escalonado** (ex: até R$ 500/mês = 15%; acima de R$ 500 = 20%)
4. **Por procedimento específico** (ex: Botox = 25%, Laser = 30%)

**Interface:**
```
┌─────────────────────────────────────┐
│ Comissões por Profissional          │
├─────────────────────────────────────┤
│ Profissional: [dropdown]            │
│                                     │
│ ○ Percentual (%)  [20]%            │
│ ○ Valor fixo      R$ [50]          │
│ ○ Escalonado      (definir faixas)  │
│ ○ Por procedimento (definir tabela) │
│                                     │
│ Tabela de Comissões por Procedimento│
│ ┌───────────────────────────────┐  │
│ │ Procedimento  | Tipo   | Valor│  │
│ ├───────────────────────────────┤  │
│ │ Botox         | %      | 25%  │  │
│ │ Laser CO2     | Fixo   | R$75 │  │
│ │ Microagulhas  | %      | 15%  │  │
│ └───────────────────────────────┘  │
│                                     │
│ [Salvar] [Cancelar]                │
└─────────────────────────────────────┘
```

**Impacto no CRM:**
- Ao fazer checkout, sistema calcula automaticamente a comissão devida
- Dados aparecem em relatório de comissões (se implementado)
- Histórico é auditável (imutável; mudanças futuras não afetam histórico)

---

#### 7.1.2 Configurar Formas de Pagamento
**Quem pode:** Dono (✅)  
**Status MVP:** 🟡 (Parcial — apenas PIX, dinheiro, débito; crédito em Fase 2)

**Descrição:**  
Define quais métodos de pagamento a clínica aceita.

**Métodos suportados:**
- Dinheiro (sem taxa)
- PIX (taxa? [0]%)
- Débito (taxa? [2]%)
- Crédito à vista (taxa? [3.5]%)
- Crédito parcelado (taxa? [4-5]% + juros)
- Vale-refeição (empresa parceira)
- Crédito em conta (financiamento interno)

**Funcionalidades:**
- Ativar/desativar métodos
- Definir taxa por método
- Limitar parcelamento (ex: máx 12x em crédito)

**Impacto no CRM:**
- Faturamento oferece apenas métodos habilitados
- Cálculo de valor com taxa é automático (transparência)
- Relatório financeiro consolida por método

---

#### 7.1.3 Configurar Retenções e Descontos
**Quem pode:** Dono (✅)  
**Status MVP:** ❌ (Fase 2)

**Descrição:**  
Define descontos automáticos (ex: 10% para primeira consulta, 5% para indicação) e retenções (ex: 2% Imposto sobre Serviço).

**Tipos:**
- Desconto por primeira consulta
- Desconto por indicação
- Desconto por pacote (já em Procedimentos)
- Retenção (ISS, IR) para profissionais autônomos

---

### 7.2 Fluxo de Sincronização (Comissões → CRM)

```
┌──────────────────────────────────────────┐
│ ADMIN: Define comissão                   │
│        Prof. "Maria" = 20% Botox         │
└──────────────────┬──────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │ Insert em tabela comissoes           │
    │ (prof_id, procedimento, tipo,        │
    │  percentual, data_vigencia)          │
    │                                      │
    │ → Realtime event emitido             │
    └──────────────────┬────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────┐
    │ CRM: Faturamento recebe              │
    │                                      │
    │ 1. Ao fazer checkout de Botox:       │
    │    - Se procedimento foi feito por   │
    │      "Maria"                         │
    │    - Calcula: R$ 300 (preço) ×      │
    │      20% = R$ 60 de comissão         │
    │                                      │
    │ 2. Transação de checkout registra:   │
    │    valor_total: 300                  │
    │    comissao_devida: 60               │
    │    valor_liquido: 240 (apenas demo)  │
    │                                      │
    │ 3. Relatório de Comissões:           │
    │    - Consolida valor devido por prof │
    │    - Permite filtrar por período     │
    └──────────────────────────────────────┘
```

---

## 8. Módulo 6: Templates de Mensagens & Comunicação

### 8.1 Requisitos Funcionais

#### 8.1.1 Listar Templates de Mensagens
**Quem pode:** Dono (✅), Equipe (🔍)

**Descrição:**  
Centraliza templates de mensagens (WhatsApp, SMS, e-mail) reutilizáveis em automações e comunicações manuais.

**Colunas:**
- ID
- Nome do template
- Canal (WhatsApp, SMS, Email, In-app)
- Tipo/Gatilho (ex: "Confirmação de agendamento", "Pós-procedimento 24h", "Resgate inativo 60 dias")
- Procedimento relacionado (se aplicável)
- Texto preview (primeiros 50 caracteres)
- Status (ativo/inativo)
- Ações

---

#### 8.1.2 Criar Template de Mensagem
**Quem pode:** Dono (✅)

**Campos:**
- Nome do template
- Canal (select)
- Tipo/Gatilho (select ou custom)
- Procedimento relacionado (optional)
- Corpo da mensagem (textarea)
- Variáveis disponíveis (preview dinâmico):
  - `{nome}` = nome do paciente
  - `{data_agendamento}` = data e hora do agendamento
  - `{procedimento}` = nome do procedimento
  - `{profissional}` = nome de quem faz o procedimento
  - `{valor}` = preço

**Exemplo:**
```
Template: Confirmação Agendamento

Canal: WhatsApp

Corpo:
"Olá {nome}! 🌟 Sua consulta de {procedimento} foi
confirmada para {data_agendamento} com {profissional}.
Valor: {valor}. 
Tem dúvida? Clique aqui: [link]"

Status: ✅ Ativo
```

**Impacto no CRM:**
- Quando automação se dispara (gatilho), texto é renderizado com variáveis substituídas
- Permite a equipe usar template em comunicação manual (copy-paste com variáveis já preenchidas)
- Histórico de envios (se feature de audit implementada) registra qual template foi usado

---

#### 8.1.3 Editar Template
**Quem pode:** Dono (✅)

**Validações:**
- Corpo da mensagem não pode estar vazio
- Variáveis devem estar no formato `{variavel}` para reconhecimento
- Alerta se variável usada não existe (ex: `{endereço_paciente}` não existe)

**Impacto:**
- Mudanças em templates prospectivos afetam automatizações futuras
- Não afeta mensagens já enviadas (auditoria)

---

#### 8.1.4 Grupos de Templates (Por Procedimento)
**Quem pode:** Dono (✅)

**Descrição:**  
Ao criar procedimento, sistema cria automaticamente um grupo de templates pré-configurados:

```
Procedimento: Botox Frontal
  ├─ Confirmação de agendamento
  ├─ Lembrete 24h antes
  ├─ Bem-vindo pós-procedimento (24h)
  ├─ Orientações pós (pode ser customizado)
  └─ Avaliação de satisfação (48h)
```

Admin pode editar cada um ou manter padrão.

---

### 8.2 Fluxo de Sincronização (Templates → CRM)

```
┌──────────────────────────────────────────┐
│ ADMIN: Edita template pós-procedimento    │
│        "Botox: Boas-vindas 24h"          │
│        Altera texto da mensagem          │
└──────────────────┬──────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │ Update templates_mensagens           │
    │ (campo: corpo_mensagem)              │
    │                                      │
    │ → Realtime event emitido             │
    └──────────────────┬────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────┐
    │ CRM: Motor de Automações recebe      │
    │                                      │
    │ 1. Se automação agendada para hoje   │
    │    às 24h para cliente "João":       │
    │    - Renderiza novo texto            │
    │    - Envia mensagem com novo         │
    │      conteúdo                        │
    │                                      │
    │ 2. Mensagens já enviadas:            │
    │    mantêm conteúdo original          │
    │    (histórico imutável)              │
    │                                      │
    │ 3. Automações pendentes:             │
    │    usam novo template na próxima     │
    │    execução                          │
    └──────────────────────────────────────┘
```

---

## 9. Fluxos de Sincronização de Dados (Admin ↔ CRM)

### 9.1 Arquitetura Geral de Sincronização

```
┌─────────────────────────────────────────────────────────┐
│                      ADMIN PANEL                        │
│  (Gestão de config, usuários, procedimentos, etc)       │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ UPDATE/INSERT/DELETE
                     │
                     ▼
    ┌────────────────────────────────────────────────┐
    │   SUPABASE DATABASE (Single Source of Truth)   │
    │                                                │
    │  Tables:                                       │
    │  - usuarios (config do dono)                   │
    │  - equipe (membros)                            │
    │  - procedimentos (serviços + preços)           │
    │  - salas (infraestrutura)                      │
    │  - comissoes (regras financeiras)              │
    │  - templates_mensagens (automações)            │
    │  - agendamentos (appointments)                 │
    │  - clientes (pacientes)                        │
    │  - checkout (transações)                       │
    │                                                │
    └────────────┬─────────────────────────────────┘
                 │
                 │ Supabase Realtime
                 │ (Postgres Changes)
                 │
    ┌────────────▼─────────────────────────────────┐
    │            CRM PRINCIPAL                     │
    │  (Agenda, Jornada, Prontuário, Faturamento) │
    │                                               │
    │  Subscribers:                                 │
    │  - Agenda Inteligente                        │
    │  - Jornada do Cliente (Kanban)               │
    │  - Prontuário Virtual                        │
    │  - Módulo Financeiro                         │
    │  - Motor de Automações                       │
    │                                               │
    └────────────────────────────────────────────┘
```

### 9.2 Latência e Consistência

**Garantias:**
- **Eventual Consistency:** Dados são sincronizados em < 100ms (mesmo datacenter)
- **Strong Consistency (DB):** Row-Level Security garante que dados do outro tenant não são acessíveis
- **Audit Trail:** Todas as mudanças são registradas em `audit_logs` com actor_id, timestamp, changes

**Cenário crítico (ex: preço de procedimento):**
```
T0:00 Admin altera preço de Botox: 300 → 350
T0:05 Evento Realtime propagado para todos os clientes conectados
T0:10 Novo agendamento feito com recepcionista usa preço R$ 350
T0:15 Checkout exibe R$ 350 (consistência garantida)

Agendamentos ANTIGOS (já criados antes de T0:00):
  - Permanecem com R$ 300 até faturamento
  - Decisão manual (aceitar novo preço ou manter original)
  - Transparência: exibe ambas as opções
```

---

### 9.3 Padrão de Observação (CRM como "Listener")

```javascript
// Pseudocódigo: como o CRM se inscreve em mudanças

const unsubscribe = supabase
  .channel('public:procedimentos')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'procedimentos' },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        // Novo procedimento: atualiza dropdown da agenda
        addProceduresToAgenda(payload.new);
      } else if (payload.eventType === 'UPDATE') {
        // Preço mudou: refaz cálculos
        updateProcedureInAgenda(payload.new);
      }
      // ...
    }
  )
  .subscribe();
```

---

## 10. Matriz de Impactos no CRM

### 10.1 Mapeamento: Alteração no Admin → Impactos no CRM

| Alteração no Admin | Módulo CRM Afetado | Impacto | Latência |
|---|---|---|---|
| **Criar/editar membro da equipe** | Agenda Inteligente | Dropdown de profissionais atualizado; fotos refreshadas | < 100ms |
| | Jornada do Cliente | Nome/foto do prof. visível na esteira Kanban | < 100ms |
| | Prontuário | Histórico de consultas mostra prof. atualizado | < 100ms |
| **Desativar membro** | Agenda Inteligente | Profissional removido do dropdown; agendamentos futuros não permitem seleção | < 100ms |
| | Relatórios | Comissão não é calculada para futuras realizações | Imediato |
| **Alterar horário de funcionamento** | Agenda Inteligente | Bloqueios automáticos recalculados; horas fora do horário são indisponíveis | < 100ms |
| | Agendamento Online | Disponibilidades públicas recalculadas em tempo real | < 100ms |
| **Criar procedimento** | Agenda | Novo item no dropdown de serviços | < 100ms |
| | Faturamento | Disponível para seleção ao fazer checkout | < 100ms |
| | Automações | Grupo de templates pré-criado | < 100ms |
| **Alterar preço** | Faturamento | Novos agendamentos usam novo preço | < 100ms |
| | Relatórios | DRE/Lucratividade recalculado prospectivamente | < 100ms |
| **Alterar duração** | Agenda Inteligente | Algoritmo de encaixe recalcula brechas | < 100ms |
| | Relatórios | Ocupação de agenda refaz análise | < 100ms |
| **Criar sala** | Agenda | Sala disponível para seleção | < 100ms |
| **Alterar equipamentos de sala** | Agenda | Validação de procedimento X sala é re-avaliada | < 100ms |
| **Configurar comissão** | Faturamento | Próximos checkouts usam nova comissão | < 100ms |
| | Relatórios | Cálculos prospectivos refazem estimativas | < 100ms |
| **Editar template de mensagem** | Motor de Automações | Próximas automações usam novo texto; histórico preservado | < 100ms |

---

### 10.2 Validações Críticas no CRM (Decorrentes de Mudanças no Admin)

```
┌─────────────────────────────────────────────────────────┐
│  CRM Deve Validar ao Agendar:                          │
├─────────────────────────────────────────────────────────┤
│ ✓ Data/hora dentro do horário de funcionamento          │
│ ✓ Profissional está ativo (não desativado no Admin)     │
│ ✓ Sala existe e está ativa                              │
│ ✓ Procedimento existe e está ativo                      │
│ ✓ Paciente não tem conflito de horário                  │
│ ✓ Duração do procedimento cabe na brecha de tempo       │
│ ✓ Se procedimento requer sala específica, valida        │
│                                                         │
│  Se alguma validação falha:                             │
│  → Erro amigável com sugestão de correção               │
│  → Exemplo: "Prof. Maria está indisponível.             │
│     Próxima disponibilidade: [data]"                    │
└─────────────────────────────────────────────────────────┘
```

---

## 11. Resumo do MVP vs. Full Product

### 11.1 MVP (Fase 1 — Now)

**Escopo minimalista: apenas o essencial para operação diária**

#### Admin MVP inclui:

| Módulo | Funcionalidades | Status |
|---|---|---|
| **1. Gestão de Usuários** | Listar membros | ✅ |
| | Criar novo membro (convite) | ✅ |
| | Editar membro | ✅ |
| | Desativar membro | ✅ |
| | Perfil pessoal (self-service) | ✅ |
| **2. Configurações da Clínica** | Editar dados básicos (nome, telefone, endereço) | ✅ |
| | Horário de funcionamento (seg-dom) | ✅ |
| | Períodos fechados (feriados, recesso) | ✅ |
| **3. Procedimentos** | Listar | ✅ |
| | Criar | ✅ |
| | Editar (preço, duração, descrição) | ✅ |
| | Deletar / Desativar | ✅ |
| **4. Salas** | Listar | ✅ |
| | Criar | ✅ |
| | Editar | ✅ |
| | Deletar | ✅ |
| **5. Comissões** | Configurar % por profissional | ✅ |
| | Configurar por procedimento (simples) | ✅ |
| **6. Templates** | Listar | ✅ |
| | Editar templates padrão por procedimento | ✅ |
| **7. Permissões** | Role-based access (Dono vs. Equipe) | ✅ |
| | RLS policies no Supabase | ✅ |

**Não inclusos no MVP:**
- ❌ Tabela de preços com pacotes/desconto por volume
- ❌ Escalonamento de comissões (faixas)
- ❌ Gestão de equipamentos detalhada
- ❌ Dashboard de analytics (nível 1)
- ❌ Importação/exportação em massa
- ❌ Agendamentos em massa
- ❌ Logs de auditoria (UI avançada)
- ❌ Permissões granulares (gerente, financeiro, auditor)

---

### 11.2 Full Product (Fase 2+)

**Expansões e funcionalidades avançadas**

| Módulo | Funcionalidades Novas |
|---|---|
| **Comissões** | Escalonado (faixas); Por franquia; Distribuição automática entre coprocedimento |
| **Pacotes & Créditos** | Criação de pacotes; Desconto por volume; Expiração automática; Resgate de créditos |
| **Equipamentos** | Cadastro master; Manutenção preventiva; Alertas de vencimento |
| **Retenções & Descontos** | Desconto 1ª consulta; Desconto indicação; ISS/IR automático; Cupons customizados |
| **Relatórios** | Dashboard de metas; LTV por paciente; ROI por canal; DRE; Comissões por período |
| **Automações** | Gatilhos customizáveis; Escalonamento de cobrança; Reativação de inativos |
| **Importação** | CSV de agendamentos; CSV de procedimentos; Sincronização de outros CRMs |
| **Multiclínicas** | Consolidação de relatórios por rede; Transferência de pacientes; Permissões de acesso cruzado |
| **Permissões** | Roles: Auditor, Financeiro, Gerente; Permissões granulares por módulo; Auditoria de ações do admin |
| **Integrações** | Webhook para sistemas parceiros; API pública; Sincronização com Google Agenda |

---

### 11.3 Estimativa de Esforço

**MVP:**
- Estrutura base (RLS, auth): ~40 horas
- Gestão de usuários: ~20 horas
- Configurações da clínica: ~15 horas
- Procedimentos: ~20 horas
- Salas: ~15 horas
- Comissões simples: ~15 horas
- Templates: ~15 horas
- Testes + integração: ~30 horas

**Total MVP: ~170 horas (~4 semanas, staff time)**

**Full Product (incremental):**
- Pacotes & créditos: ~40 horas
- Escalas de comissão: ~25 horas
- Dashboard avançado: ~50 horas
- Automações: ~60 horas
- Multiclínicas: ~80 horas
- Integrações: ~100 horas

**Total adicional: ~355 horas (~8-10 semanas)**

---

## Diagrama de Fluxo Consolidado: Admin → CRM

```
┌─────────────────────────────────────────────────────────────────┐
│                          ADMIN PANEL                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Usuários &  │  │ Configuração │  │ Procedimentos│          │
│  │  Equipe      │  │  Clínica     │  │ & Preços    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                 │
│  ┌──────┴────────┐  ┌─────▼────────┐  ┌─────▼──────────┐      │
│  │ Salas         │  │ Comissões    │  │ Templates      │      │
│  │ Infraestrutura│  │ Financeiras  │  │ Mensagens      │      │
│  └──────┬────────┘  └─────┬────────┘  └─────┬──────────┘      │
│         │                 │                  │                 │
│         └─────────────────┼──────────────────┘                 │
│                           │                                    │
│                           ▼                                    │
│           ┌───────────────────────────────┐                   │
│           │  Trigger / RLS Policy Violation│                  │
│           │  Audit Log (actor, timestamp)  │                  │
│           └───────────────┬─────────────────┘                 │
│                           │                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │
                            │ Supabase Realtime
                            │ (postgres_changes)
                            │ Latência: < 100ms
                            │
        ┌───────────────────▼────────────────────┐
        │      SUPABASE DATABASE                 │
        │   (Single Source of Truth)             │
        │                                        │
        │  RLS Policies:                         │
        │  - usuarios_select                     │
        │  - clientes_all                        │
        │  - agendamentos_all                    │
        │  - procedimentos_all                   │
        │  - comissoes_all                       │
        │  - templates_all                       │
        │                                        │
        └───────────────────┬────────────────────┘
                            │
        ┌───────────────────▼────────────────────┐
        │                                        │
        │  ┌──────────────────────────────────┐  │
        │  │  CRM PRINCIPAL                   │  │
        │  │  (Listeners subscribed)          │  │
        │  │                                  │  │
        │  │  ┌────────────────────────────┐ │  │
        │  │  │ Agenda Inteligente        │ │  │
        │  │  │ - Dropdown de profs       │ │  │
        │  │  │ - Blocos de horários      │ │  │
        │  │  │ - Validação de sala       │ │  │
        │  │  └────────────────────────────┘ │  │
        │  │                                  │  │
        │  │  ┌────────────────────────────┐ │  │
        │  │  │ Jornada do Cliente        │ │  │
        │  │  │ - Nomes de profissionais  │ │  │
        │  │  │ - Validação de status     │ │  │
        │  │  └────────────────────────────┘ │  │
        │  │                                  │  │
        │  │  ┌────────────────────────────┐ │  │
        │  │  │ Faturamento               │ │  │
        │  │  │ - Preços base             │ │  │
        │  │  │ - Comissões calculadas    │ │  │
        │  │  │ - Métodos de pagamento    │ │  │
        │  │  └────────────────────────────┘ │  │
        │  │                                  │  │
        │  │  ┌────────────────────────────┐ │  │
        │  │  │ Motor de Automações       │ │  │
        │  │  │ - Triggers (gatilhos)     │ │  │
        │  │  │ - Templates renderizados  │ │  │
        │  │  │ - Envio de mensagens      │ │  │
        │  │  └────────────────────────────┘ │  │
        │  │                                  │  │
        │  └──────────────────────────────────┘  │
        │                                        │
        └────────────────────────────────────────┘
```

---

## Conclusão

Este documento estabelece a **arquitetura funcional completa** do Painel Administrativo do Lumina CRM. Todos os módulos foram mapeados com:

✅ Requisitos funcionais detalhados  
✅ Fluxos de sincronização de dados (Admin → CRM)  
✅ Matriz de permissões (ACL) baseada em role  
✅ Impactos específicos em cada módulo do CRM  
✅ Separação clara: MVP vs. Full Product  

**Próximos passos (Staff Developer):**
1. Mapear endpoints/APIs específicas para cada funcionalidade
2. Definir schema detalhado de banco (constraints, índices)
3. Implementar testes de RLS (edge cases de permissão)
4. Integrar com sistema de logs/auditoria
5. Documentar contratos de API (OpenAPI/GraphQL, conforme arquitetura)

---

**Versão:** 1.0  
**Último update:** Junho 2026  
**Mantido por:** [Equipe Dev]  
**Status:** ✅ Pronto para desenvolvimento

# ConnectingNeeds v2 Specification (`ConnectingNeedsv2-specs.md`)

## 1. Vision & Architecture

**ConnectingNeeds v2** is the central intent-matching and peer-collaboration ecosystem within the **iNoU Platform**. It pairs decentralized human and AI capabilities by treating every human aspiration as a structured **Need** and every capability as a structured **Offer**.

```
+─────────────────────────────────────────────────────────────────────────────+
|                         ConnectingNeeds v2 Hub                              |
|                                                                             |
|   +──────────────────+   +──────────────────+   +───────────────────────+   |
|   |  My Active Needs |   | My Active Offers |   |   Match Radar (Feed)  |   |
|   |   (3 Published)  |   |   (2 Published)  |   |  (4 High-Affinity)    |   |
|   +──────────────────+   +──────────────────+   +───────────────────────+   |
|                                                                             |
|   +─────────────────────────────────────────────────────────────────────+   |
|   |                      Active Connections Workspace                   |   |
|   |          (In-Platform Collaboration · Match Rooms · Milestones)     |   |
|   +─────────────────────────────────────────────────────────────────────+   |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
                        Sync / Realtime Events / Brevo API
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
|                       iNoU Cloud Registry (GCP / Firebase)                  |
|                                                                             |
|  • Global Semantic Match Engine (Complement Matrix & Vector Affinity)       |
|  • Brevo Transactional Email Triggers on Match Discovery                    |
|  • Gamified Platform Credits Vault (Rewarded on Verified Fulfillment)       |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Semantic Complement Matching Model

Every interaction follows the canonical formula:
- **NEED**: `(VERB) + (OBJECT)` + `[Detailed Context & Constraints]`
- **OFFER**: `(COMPLEMENT_VERB) + (OBJECT)` + `[Capacity & Portfolio]`

### 2.1 Canonical Complement Pairs
| Need Verb | Offer Complement Verb | Matching Semantic |
|---|---|---|
| `Request` | `Donate` / `Fulfill` | Pro-bono / Community collaboration |
| `Buy` / `Need` | `Sell` / `Supply` | Commercial transaction / Service provision |
| `Seek` / `Consult` | `Advise` / `Offer` | Mentorship, technical consulting, expertise |
| `Design` / `Plan` | `Build` / `Execute` | Creative planning to implementation |
| `Transport` | `Drive` / `Carry` | Logistics and mobility exchange |
| `Recruit` / `Employ` | `Apply` / `Execute` | Talent and team expansion |

### 2.2 Primary Marketplace Categories

ConnectingNeeds classifies all published Needs and Offers into three core human domains:

1. **💼 Job & Work Search (`JOB_WORK`)**:
   - **Focus**: Professional hiring, freelancing, contract gigs, technical collaborations, and career opportunities.
   - **Need Intent**: `Recruit`, `Employ`, `Contract`, `Hire`, `SeekJob`.
   - **Offer Intent**: `Apply`, `Work`, `OfferSkills`, `Freelance`, `Consult`.
   - **Example**: *"Need: Senior TypeScript Engineer for Distributed DB"* <-> *"Offer: Senior Backend & DB Architect"*.

2. **🤝 Friend & Partner Search (`SOCIAL_PARTNER`)**:
   - **Focus**: Companionship, language exchange, hobby/sports partners, study buddies, co-founder discovery, and relationships.
   - **Need Intent**: `SeekFriend`, `SeekPartner`, `SeekCoFounder`, `Talk`, `Meet`.
   - **Offer Intent**: `Connect`, `Befriend`, `Collaborate`, `ShareTime`, `Listen`.
   - **Example**: *"Need: Language Exchange Partner (Spanish <-> English)"* <-> *"Offer: Native English Speaker learning Spanish"*.

3. **❤️ Humanitarian Help (`HUMANITARIAN_AID`)**:
   - **Focus**: Crisis relief, community mutual aid, food/clothing donations, volunteer labor, shelter, medical assistance, and emergency logistics.
   - **Need Intent**: `RequestAid`, `SeekShelter`, `RequestFood`, `NeedHelp`, `VolunteerRequest`.
   - **Offer Intent**: `Donate`, `Volunteer`, `ProvideAid`, `Rescue`, `Support`, `Supply`.
   - **Example**: *"Need: Emergency Food Supply for Community Center"* <-> *"Offer: Donate 50 Food Packages & Logistics"*.

### 2.3 Semantic Equivalence: The `search` Command (`search` ↔ `need job`)

In iNoU, natural language intent and the canonical command **`search`** are semantically unified:

- **Input Variations**: `search job`, `search developer`, `need job`, `busco trabajo`, `necesito empleo`, `seek work`, `quiero chamba`.
- **Semantic Resolution**:
  - All resolve to the canonical formula: **`NEED = (Search / Seek / Need) + (Job / <Role>)`**.
- **Execution & Flow**:
  1. **Instant Radar Query**: Running `search job <keyword>` immediately scans the ConnectingNeeds cloud registry for active matching `Offer` / `JobSpec` proposals.
  2. **Conversational Publish Fallback**: If no immediate high-confidence match is found, iNoU seamlessly asks:
     > *"No hay ofertas exactas publicadas en este momento. ¿Te gustaría publicar tu búsqueda de empleo como una Necesidad activa para que los reclutadores te encuentren en la red?"*
  3. **1-by-1 Intake Activation**: If the user confirms (`yes` / `sí`), iNoU launches the step-by-step interview to build their structured candidate profile specification.

---

## 3. Core Pillar: AI Specification Engineering Engine

A primary goal and superpower of **iNoU** is acting as an **expert AI Requirements Engineer & Spec-Writer**. 

Most human desires begin as vague, ambiguous requests (e.g. *"I need an app for my bakery"* or *"I need a developer for my idea"*). iNoU transforms these raw concepts into rigorous, executable, and actionable **Technical Specifications**.

```
[ Raw Human Prompt ] ──► "I want a mobile app for my restaurant"
          │
          ▼
[ iNoU Spec-Engineering Engine ]
  • Guided Requirement Extraction (Target users, timeline, budget, stack)
  • Ambiguity Resolution & Proactive Questioning
  • Goal & Milestone Decomposition (AST sub-needs)
  • Deliverable Acceptance Criteria Definition
          │
          ▼
[ Formal Job Spec Document Attached to Need ]
  ├── 1. Objective & Scope
  ├── 2. Architecture & Tech Stack (e.g. Flutter + Node.js + PostgreSQL)
  ├── 3. Structured Milestones (M1: Auth & Menu, M2: Cart & Checkout)
  ├── 4. Non-Functional Requirements (Offline support, <200ms latency)
  └── 5. Canonical Complement Need: "need create --verb Contract --object RestaurantApp"
```

### 3.1 Spec Engineering Benefits for `JOB_WORK`
1. **Precision Matching**: Candidates and contractors match on clear technical requirements rather than fuzzy descriptions.
2. **Zero Ambiguity**: Both the employer and the freelancer start with a mutual, structured roadmap of deliverables.
3. **Automated Verification**: Milestones can be verified against the specification criteria to release milestone completions and reward platform credits.

### 3.2 Conversational 1-by-1 Intake Flow (`create job offer` / `create job need`)

When a user runs the command **`create job offer`** (or types *"I want to post a job"* in plain language), iNoU initiates an **interactive step-by-step interview** asking questions 1 by 1:

```
[User] iNoU > create job offer

[iNoU] 📋 Iniciando Especificación de Puesto de Trabajo (Job Spec Engine)...
       Paso 1/5: ¿Cuál es el título del puesto y el objetivo principal del proyecto?

[User] iNoU > Senior Full-Stack Engineer para construir la plataforma web y móvil

[iNoU] ✔ Título y objetivo capturados.
       Paso 2/5: ¿Cuáles son las tecnologías obligatorias y las deseables (stack técnico)?

[User] iNoU > TypeScript, React, Node.js, SQLite/PostgreSQL y Docker. Deseable: PWA.

[iNoU] ✔ Stack técnico estructurado.
       Paso 3/5: ¿Cuál es la modalidad (Remoto / Híbrido) y la zona horaria requerida?

[User] iNoU > 100% Remoto, zona horaria LATAM o US Central.

[iNoU] ✔ Modalidad documentada.
       Paso 4/5: ¿Cuáles son los hitos (milestones) y entregables clave esperados?

[User] iNoU > Hito 1: Auth y Base de Datos (2 semanas). Hito 2: MVP Frontend y API (3 semanas).

[iNoU] ✔ Hitos descompuestos en sub-necesidades.
       Paso 5/5: ¿Cuál es el rango de compensación / presupuesto y fecha estimada de inicio?

[User] iNoU > $4,000 - $5,000 USD / mes o equivalente por hito. Inicio inmediato.

[iNoU] ✨ [ESPECIFICACIÓN TÉCNICA GENERADA Y PUBLICADA]
       ══════════════════════════════════════════════════════════════════════════
       📄 Documento de Especificación: #spec_job_9841
       🎯 Publicado en ConnectingNeeds: "need create --verb Recruit --object SeniorFullStack"
       🔔 Radar de Matching: Escaneando candidatos con complementos afines en la red...
```

### 3.3 End-to-End Hiring Orchestration Pipeline (`hire <count> people`)

When a user requests multi-role hiring (e.g. *"Help me hire 2 developers: 1 Senior Frontend, 1 Backend Architect"*), iNoU executes a 5-stage automated goal decomposition tree:

```
[ User Prompt ] ──► "Help me hire 2 developers: 1 Frontend, 1 Backend"
        │
        ▼
[ Stage 1: Multi-Role Spec Engineering ]
  ├── Generates Role A Spec: #spec_frontend_senior
  └── Generates Role B Spec: #spec_backend_architect
        │
        ▼
[ Stage 2: Automated Multi-Channel Distribution ]
  ├── Out-of-the-box LinkedIn Post generation & direct publication via LinkedIn API
  └── Global ConnectingNeeds network publication (2 active Need records)
        │
        ▼
[ Stage 3: Interview Roadmap & Rubric Generation ]
  ├── 3-Stage Interview Scripts (Screening, Technical Deep Dive, Cultural Fit)
  └── Role-specific scoring rubrics & technical question bank
        │
        ▼
[ Stage 4: Candidate Pipeline & Match Rooms ]
  ├── Candidates paired into dedicated Match Rooms for technical Q&A
  └── Real-time affinity scoring & automated candidate follow-up reminders
        │
        ▼
[ Stage 5: Onboarding & Milestone Transition ]
  └── Hired engineers automatically transition into project execution trees (AST)
```

### 3.4 Out-of-the-Box LinkedIn Integration

iNoU provides native, out-of-the-box integration with LinkedIn to automate sourcing:

1. **Native Social Integration**:
   - Registered under `⚙ Integraciones` in the Config tab and CLI (`social connect linkedin`).
2. **Automated Job Post Generation**:
   - Produces high-engagement LinkedIn posts containing role summary, tech stack, key benefits, relevant hashtags, and a direct 1-click application link back into ConnectingNeeds.
3. **One-Click Direct Publishing**:
   - `publish linkedin --job <specId>` automatically posts the job update to the user's personal LinkedIn profile or connected company page via LinkedIn Share / Community API.

---

## 4. In-Platform UI & User Experience

### 4.1 The Match Radar Card
Every proposed match is presented in the **ConnectingNeeds UI** with full visual clarity:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎯 MATCH PROPOSAL #match_9821                     Confidence: 96% [STRONG]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🔵 YOUR NEED:                               🟢 PEER OFFER:                 │
│  "Request: Flutter Mobile Architecture"     "Offer: Cross-Platform Mobile" │
│  Scope: GLOBAL · Published 1d ago           User: @carlos_dev (Verified)   │
│                                                                             │
│  Summary of Alignment:                                                      │
│  • Complement: Request <-> Offer                                            │
│  • Domain: Mobile Engineering & Dart                                        │
│  • Location: Remote (Global)                                                │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ 🤝 Accept Connection ]     [ 💬 Message / Counter ]     [ ❌ Dismiss ]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Match Lifecycle States

```
[ PROPOSED ] ──────────► [ ACCEPTED_BY_ONE ] ──────────► [ CONNECTED ]
     │                            │                           │
     ▼                            ▼                           ▼
[ DISMISSED ]                [ TIMED_OUT ]               [ IN_PROGRESS ]
                                                              │
                                                              ▼
                                                        [ FULFILLED ]
                                                              │
                                                     (Credits Rewarded)
```

1. **`PROPOSED`**: AI matching engine identified high semantic affinity in the global registry.
2. **`ACCEPTED_BY_ONE`**: One party has accepted; an instant notification is dispatched to the peer.
3. **`CONNECTED`**: Both parties accepted. A private **In-Platform Match Room** is unlocked.
4. **`IN_PROGRESS`**: Active collaboration with milestone tracking.
5. **`FULFILLED`**: Both parties confirm successful delivery. **iNoU Platform Credits** are automatically minted to both accounts.
6. **`DISMISSED`**: Hidden from the radar without penalizing either user.

---

## 5. Multi-Channel Alert & Notification System

1. **Email Notification (Brevo API - Feature Flagged: `ENABLE_BREVO_NOTIFICATIONS=false`)**:
   - *Status*: **Deferred / Optional Phase**. Disabled by default behind a configuration flag.
   - When enabled in production, Brevo delivers transactional match alert emails to `@gmail.com`.
2. **In-App Toast & Badging (Active / Primary)**:
   - Real-time notification badge (`🔔 3`) on the ConnectingNeeds tab across Web, Mobile, and Desktop.
3. **CLI Command Parity (Active / Primary)**:
   - `need list` / `offer list`
   - `match` (Runs real-time radar scan)
   - `match accept <matchId>`
   - `match dismiss <matchId>`
   - `match chat <matchId>`

---

## 6. Gamification & Tokenomics Integration

- **Earning Platform Credits**:
  - Completing a connected need awards platform credits.
  - Credits represent network reputation and purchasing power.
- **Spending Platform Credits**:
  - Spend credits to query premium non-free LLMs (Claude 3.5 Sonnet, GPT-4o) through the managed cloud gateway without paying fiat currency.

---

## 7. Scope & Future Group Privacy

- **Default Scope**: `GLOBAL` (Visible to the entire decentralized network for maximum match probability).
- **Future Group / Community Scopes**:
  - `community:<id>` (Restricted to specific universities, DAOs, or companies).
  - `group:<id>` (Restricted to private working groups).


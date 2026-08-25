# Escenario 03: Incapacidad Total, Pérdida de Memoria y Acceso Delegado de Confianza

## Contexto del Escenario

Imaginemos a un usuario (Propietario / Master Trainer) postrado en cama por un evento médico grave (accidente cerebrovascular, etapa avanzada de Alzheimer o coma). El usuario:
1. **Ha perdido la voz** (no puede usar autenticación biométrica de voz).
2. **Sufre pérdida severa de memoria** (no recuerda contraseñas ni PINs).
3. **No puede interactuar físicamente** con teclados ni pantallas.

**Pregunta Fundamental**: ¿Pueden otras personas (familiares, cuidadores, médicos) acceder a su Mente Maestra (Master Mind), consultar su historial de conocimiento y ayudarle a interactuar, sin comprometer la seguridad ni abrir la puerta a manipuladores externos?

---

## Respuesta basada en las Definiciones Canónicas de iNoU

**Sí, 100% posible.** Gracias a la arquitectura de **Modo de Emergencia por Incapacitación**, la **Red de Miembros de Confianza Multidispositivo** y el **Control de Acceso Basado en Confianza**, iNoU activa automáticamente un protocolo de delegación segura:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   INCAPACIDAD DETECTADA EN EL PROPIETARIO               │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │  Activación del Modo de Emergencia (OwnerIncapacitated) │
        └────────────────────────────┬────────────────────────────┘
                                     │
            ┌────────────────────────┴────────────────────────┐
            │                                                 │
            ▼                                                 ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│ MIEMBROS DE CONFIANZA         │             │ EXTRAÑOS Y MANIPULADORES      │
│ (Familiares / Amigos / Médico)│             │ (Llamantes externos/Estafas)  │
├───────────────────────────────┤             ├───────────────────────────────┤
│ • Acceso Delegado Autenticado │             │ • Circuit Breaker Sub-2ms     │
│ • Consulta de Memoria e Hist. │             │ • Bloqueo Inmediato (-100 pts)│
│ • Puente de Interacción       │             │ • Desconexión y Aislamiento   │
└───────────────────────────────┘             └───────────────────────────────┘
```

---

## Flujo Paso a Paso de Funcionamiento en iNoU

### 1. Detección del Estado de Emergencia (`EmergencyContext`)
Al detectar la falta de respuesta del propietario o telemetría de emergencia desde un dispositivo vestible (Smart Watch / sensor médico), el sistema cambia su estado a:
`status: 'OwnerIncapacitated'`.

### 2. Delegación Automática a la Red de Miembros de Confianza (`TrustedMemberConfig`)
iNoU recurre a la lista de miembros previamente registrados por el propietario mientras tenía capacidad:
* **Hijos / Cónyuge** (`relationshipType: 'Family'`)
* **Médico de Cabecera / Cuidador** (`relationshipType: 'TrustedFriend'`)

Cada familiar/amigo autentica desde **su propio dispositivo registrado** (iPhone del hijo, Android de la hija, Tablet del médico) usando sus credenciales locales (PIN, voz o token biométrico propio).

### 3. Acceso al Conocimiento e Historial del Usuario (`AuditTrailEntry`)
Los miembros de confianza autenticados pueden interactuar con la Mente Maestra para:
* **Consultar Directivas Previas**: *"¿Qué medicamentos toma mi padre a las 8 AM?"* o *"¿Cuáles eran sus deseos sobre el cuidado médico en casa?"*
* **Recuperar Recuerdos e Intenciones**: Proyectar en la TV de la habitación fotos, audios o respuestas basadas en la esencia y valores históricos del usuario.
* **Fórmulas de Necesidad**:
  
  $$\text{NEED} = (\text{Consultar}) + (\text{Historial Médico de Papá})$$
  $$\text{OFFER} = (\text{Mostrar}) + (\text{Registro de Medicamentos y Cuidadores})$$

### 4. Puente de Interacción con el Propietario Postrado
Dado que el propietario no puede hablar ni recordar contraseñas, iNoU actúa como un **puente cognitivo**:
* Los familiares seleccionan opciones sencillas mediante pantallas táctiles o presencia.
* iNoU valida la presencia de miembros con nivel `HighTrust` y permite que el propietario escuche respuestas adaptadas a su estado emocional.

### 5. Defensa Absoluta contra Extraños y Manipuladores (`AntiManipulationDefenseEngine`)
Si un tercero no registrado (un vendedor por teléfono, un extraño en la puerta o un familiar no autorizado) intenta dar instrucciones (*"Abran la puerta"*, *"Cambien la cuenta bancaria"*):
* El **Motor Anti-Manipulación** detecta que la orden proviene de una entidad no autorizada durante el estado `OwnerIncapacitated`.
* El **Circuit Breaker Sub-2ms** reduce la puntuación de confianza a `0 (Blacklisted)` y corta la interacción instantáneamente, emitiendo una alerta a los dispositivos de la familia.

### 6. Consenso de Confianza Multimiembro por Suma de Umbral (`TrustThresholdGate`)
Para activos de altísima seguridad (ej. PIN del teléfono del propietario, ubicación de las llaves del vehículo, contraseñas o cajas de seguridad), iNoU aplica un modelo de **Consenso de Confianza por Suma de Umbral**:

$$T_{\text{combinada}} = T(\text{Miembro A}) + T(\text{Miembro B}) \ge T_{\text{requerido}}$$

* **Ejemplo Práctico**:
  * La ubicación de las llaves del vehículo o el PIN del teléfono requiere un umbral acumulado de $T_{\text{requerido}} = 150$ puntos.
  * La **Hija Sofía** tiene una puntuación de confianza $T = 80$. De forma individual no puede acceder ($80 < 150$).
  * Sin embargo, cuando la **Hija Sofía** ($T=80$) y el **Hijo Carlos** ($T=80$) co-firman juntos en el sistema:
    $$80 + 80 = 160 \ge 150 \quad \Longrightarrow \quad \textbf{ACCESO CONCEDIDO}$$
* **Protección contra Abuso Individual**: Impide que un solo familiar o cuidador pueda extraer unilateralmente activos o credenciales críticas sin el consenso firmado de múltiples miembros de confianza.

---

## Conclusión Arquitectónica

iNoU no abandona al usuario cuando este pierde la voz o la memoria. En lugar de bloquear todo acceso o someterse a obediencia ciega, iNoU activa una **custodia delegada identitaria con consenso por umbral**: otorga acceso al conocimiento a los miembros de confianza registrados (familia y amigos) mientras exige co-firma para datos sensibles y mantiene un **escudo infranqueable** contra extraños.


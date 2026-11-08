import {
  type MaintenanceStatus,
  type ActorRole,
  MAINTENANCE_ERROR_CODES,
  type MaintenanceErrorCode,
} from "./constants";

export interface TransitionRule {
  from: MaintenanceStatus | MaintenanceStatus[];
  to: MaintenanceStatus;
  allowedActors: ActorRole[];
  requiresReason?: boolean;
  requiresDiagnosticAndWork?: boolean;
  description: string;
}

export const TRANSITION_RULES: TransitionRule[] = [
  {
    from: "CREEE",
    to: "EN_ATTENTE",
    allowedActors: ["SYSTEM"],
    description: "Auto-dispatch immédiat du système",
  },
  {
    from: ["CREEE", "EN_ATTENTE"],
    to: "ANNULEE",
    allowedActors: ["TENANT", "ADMIN"],
    description: "Annulation par le locataire ou administrateur",
  },
  {
    from: "EN_ATTENTE",
    to: "ACCEPTEE",
    allowedActors: ["OWNER", "ADMIN"],
    description: "Acceptation par le propriétaire",
  },
  {
    from: "EN_ATTENTE",
    to: "REJETEE",
    allowedActors: ["OWNER", "ADMIN"],
    requiresReason: true,
    description: "Rejet par le propriétaire avec motif obligatoire",
  },
  {
    from: "ACCEPTEE",
    to: "TECHNICIEN_ASSIGNE",
    allowedActors: ["OWNER", "TECHNICIAN", "ADMIN"],
    description: "Assignation par propriétaire ou acceptation par technicien",
  },
  {
    from: "TECHNICIEN_ASSIGNE",
    to: "EN_COURS",
    allowedActors: ["TECHNICIAN"],
    description: "Démarrage des travaux par le technicien",
  },
  {
    from: "EN_COURS",
    to: "RESOLUE",
    allowedActors: ["TECHNICIAN"],
    requiresDiagnosticAndWork: true,
    description: "Résolution avec diagnostic et travaux obligatoires",
  },
  {
    from: "RESOLUE",
    to: "CLOTUREE",
    allowedActors: ["TENANT", "OWNER", "ADMIN"],
    description: "Clôture définitive confirmée",
  },
  {
    from: ["RESOLUE", "CLOTUREE"],
    to: "REOUVERTE",
    allowedActors: ["TENANT", "ADMIN"],
    requiresReason: true,
    description: "Réouverture pour insatisfaction avec motif obligatoire",
  },
  {
    from: "REOUVERTE",
    to: "ACCEPTEE",
    allowedActors: ["OWNER", "ADMIN"],
    description: "Nouvelle acceptation suite à réouverture",
  },
];

export interface TransitionValidationInput {
  fromStatus: MaintenanceStatus;
  toStatus: MaintenanceStatus;
  actorRole: ActorRole;
  reason?: string | null;
  diagnostic?: string | null;
  workDone?: string | null;
}

export interface TransitionValidationResult {
  valid: boolean;
  errorCode?: MaintenanceErrorCode;
  message?: string;
  rule?: TransitionRule;
}

/**
 * Validates whether a state transition is legal according to the state machine
 * and its business guard rules.
 */
export function validateTransition(input: TransitionValidationInput): TransitionValidationResult {
  const { fromStatus, toStatus, actorRole, reason, diagnostic, workDone } = input;

  const matchingRule = TRANSITION_RULES.find((rule) => {
    const fromMatches = Array.isArray(rule.from)
      ? rule.from.includes(fromStatus)
      : rule.from === fromStatus;
    return fromMatches && rule.to === toStatus;
  });

  if (!matchingRule) {
    return {
      valid: false,
      errorCode: MAINTENANCE_ERROR_CODES.INVALID_TRANSITION,
      message: `Transition illégale de "${fromStatus}" vers "${toStatus}".`,
    };
  }

  if (!matchingRule.allowedActors.includes(actorRole)) {
    return {
      valid: false,
      errorCode: MAINTENANCE_ERROR_CODES.UNAUTHORIZED_ACTOR,
      message: `Le rôle "${actorRole}" n'est pas autorisé à passer de "${fromStatus}" à "${toStatus}". Rôles autorisés: ${matchingRule.allowedActors.join(", ")}.`,
    };
  }

  if (matchingRule.requiresReason) {
    if (!reason || reason.trim().length === 0) {
      return {
        valid: false,
        errorCode: MAINTENANCE_ERROR_CODES.REASON_REQUIRED,
        message: `Un motif explicatif obligatoire est requis pour passer à "${toStatus}".`,
      };
    }
  }

  if (matchingRule.requiresDiagnosticAndWork) {
    if (!diagnostic || diagnostic.trim().length === 0) {
      return {
        valid: false,
        errorCode: MAINTENANCE_ERROR_CODES.DIAGNOSTIC_REQUIRED,
        message: "Le diagnostic technique est obligatoire pour marquer l'intervention comme résolue.",
      };
    }
    if (!workDone || workDone.trim().length === 0) {
      return {
        valid: false,
        errorCode: MAINTENANCE_ERROR_CODES.WORK_DONE_REQUIRED,
        message: "Le détail des travaux effectués est obligatoire pour marquer l'intervention comme résolue.",
      };
    }
  }

  return {
    valid: true,
    rule: matchingRule,
  };
}

/**
 * Returns the list of next statuses reachable from the current status by the given actor.
 */
export function getAllowedTransitions(
  currentStatus: MaintenanceStatus,
  actorRole: ActorRole
): { to: MaintenanceStatus; description: string; requiresReason: boolean; requiresDiagnosticAndWork: boolean }[] {
  return TRANSITION_RULES.filter((rule) => {
    const fromMatches = Array.isArray(rule.from)
      ? rule.from.includes(currentStatus)
      : rule.from === currentStatus;
    return fromMatches && rule.allowedActors.includes(actorRole);
  }).map((rule) => ({
    to: rule.to,
    description: rule.description,
    requiresReason: Boolean(rule.requiresReason),
    requiresDiagnosticAndWork: Boolean(rule.requiresDiagnosticAndWork),
  }));
}

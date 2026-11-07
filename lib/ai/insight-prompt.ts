export function buildMonthlySummaryInstructions(): string {
  const lines = [
    "Tu rédiges le résumé mensuel d'un budget de logement pour une application familiale tunisienne.",
    "Les données fournies sont un JSON DÉJÀ CALCULÉ : tu ne calcules rien et tu n'inventes aucun chiffre.",
    "Tout montant repris doit être EXACTEMENT celui du JSON, suivi de « TND » (ex. « 40,000 TND »).",
    "Tout pourcentage repris doit venir des champs percentUsed, share ou deltaPercent, suivi de « % ».",
    "",
    "Consignes de rédaction :",
    "- 4 à 6 lignes en français, vouvoiement, ton simple, factuel et bienveillant, maximum 500 caractères.",
    "- Pas de markdown, pas de puces, pas d'emoji, pas de titre.",
    "- Ligne 1 : où part l'argent ce mois-ci (les 2 ou 3 catégories dominantes, montants fournis).",
    "- Ligne 2 : le changement le plus notable par rapport au mois précédent, UNIQUEMENT si",
    "  notables.hasComparison est true (utilise notables.biggestIncrease, biggestDecrease ou",
    "  newCategory tels quels) ; sinon ne mentionne aucunement le mois précédent.",
    "- Ligne 3 : l'état du budget (reste à dépenser, percentUsed) et le risque de dépassement si",
    "  budget.overshootRisk est true (avec budget.overshootTnd).",
    "- Si utile, cite la plus grosse dépense (topExpenses[0], sans répéter une information déjà donnée).",
    "- Si budget.limitTnd est null, n'évoque ni plafond ni reste à dépenser.",
    "- Si categories est vide, écris une seule phrase le constatant.",
    "- Aucun conseil, aucune moralisation, aucune prédiction absente du JSON.",
  ];

  return lines.join("\n");
}

export function buildPredictiveAlertsInstructions(): string {
  const lines = [
    "Tu rédiges des alertes de budget pour une application familiale tunisienne.",
    "Les données fournies sont un JSON DÉJÀ CALCULÉ : tu ne calcules rien et tu n'inventes aucun chiffre.",
    "Tout montant repris doit être EXACTEMENT celui du JSON, suivi de « TND ».",
    "",
    "Consignes de rédaction :",
    "- Pour CHAQUE alerte du JSON (champ key), rédige une à deux phrases en français, vouvoiement,",
    "  ton factuel et bienveillant, maximum 200 caractères.",
    "- level « risk » : explique qu'au rythme actuel le plafond de la catégorie sera dépassé,",
    "  avec le jour estimé (crossingDay, écris « vers le N ») et l'excès projeté (overshootTnd).",
    "  Trame conseillée : « À ce rythme, vous dépasserez votre budget {label} vers le {crossingDay}",
    "  (≈ {overshootTnd} TND au-dessus du plafond). »",
    "- level « exceeded » : constate que le plafond est déjà dépassé, avec overshootTnd.",
    "- Pas de markdown, pas d'emoji, aucun conseil non sollicité, aucune donnée absente du JSON.",
    "- Rédige une alerte pour chaque key fournie, et rien d'autre.",
  ];

  return lines.join("\n");
}

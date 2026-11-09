# Module Logements

## Génération facultative de descriptions

Les propriétaires peuvent générer un brouillon de description à partir des
caractéristiques saisies dans le formulaire. Le brouillon doit être relu et
validé par le propriétaire ; il n'est jamais enregistré automatiquement.

La génération fonctionne sans configuration grâce à un modèle de texte
déterministe. Pour activer la génération par Anthropic, configurer les variables
d'environnement suivantes côté serveur :

- `ANTHROPIC_API_KEY` : clé API Anthropic. Si elle est absente ou si l'appel
  échoue, l'application utilise automatiquement le modèle de texte.
- `ANTHROPIC_MODEL` : modèle Anthropic à utiliser. Facultatif ; valeur par
  défaut : `claude-haiku-5-5`.

Ne pas exposer ces variables dans le navigateur ni les ajouter à
`.env.example`. La clé API n'est jamais renvoyée au client.

## Administration et modération

Le tableau de bord administrateur est disponible sur `/dashboard/admin` et la
modération des annonces sur `/dashboard/admin/properties`. Ces pages vérifient
le rôle actif `ADMIN`. Le tableau de bord regroupe les modules dans
`app/dashboard/admin/_components/adminModules.ts` ; pour ajouter une carte,
ajouter une seule entrée à `ADMIN_MODULES`. Renseigner `href` uniquement si la
route correspondante est déjà une route d'administration sous
`app/dashboard/**` ; sinon ne pas définir `href` (la carte reste désactivée et
affiche « Bientôt disponible »).

Pour promouvoir un compte existant en administrateur depuis PowerShell :

```powershell
npm run admin:promote -- "email"
```

Les guillemets sont importants pour les adresses contenant `+`. Le script
refuse de s'exécuter en production, ajoute le rôle sans supprimer les rôles
existants et définit le rôle actif sur `ADMIN`. Après la promotion, se
déconnecter puis se reconnecter pour renouveler la session.

Les annonces sont d'abord `pending`. L'administrateur peut les approuver ou les
rejeter avec un motif obligatoire de 10 à 1000 caractères. Une annonce
`approved` peut être retirée de la publication depuis l'onglet « Approuvés » ou
les signalements ; l'interface l'étiquette « Retirer de la publication » et
exige aussi un motif. Cette action place l'annonce dans l'état `rejected`.
Modifier un champ public d'une annonce la renvoie à `pending` et efface le
motif de rejet précédent. La file d'attente affiche les annonces les plus
anciennes d'abord ; les autres listes sont triées des plus récentes aux plus
anciennes et paginées par 12.

## Messagerie locataire / propriétaire

### Modèles

- `models/conversation.ts` : une conversation est liée à un couple
  propriétaire / locataire pour un bien (`propertyId`, `tenantId`, `ownerId`,
  `lastMessageAt`, `lastMessagePreview` (max 120 caractères),
  `tenantUnread`, `ownerUnread`, timestamps). Index unique sur
  `{propertyId, tenantId}` (une conversation par locataire et par annonce) et
  index sur `{ownerId, lastMessageAt: -1}` / `{tenantId, lastMessageAt: -1}`.
- `models/Message.ts` : `conversationId`, `senderId`, `senderRole`
  (`TENANT` | `OWNER`), `body` (1–1000 caractères), `createdAt`. Index sur
  `{conversationId, createdAt: -1}`.

Le `ownerId` d'une conversation est toujours copié côté serveur depuis le
document `Property`, jamais depuis une saisie client.

### Actions serveur (`app/actions/messages.ts`)

- `startConversation(propertyId, body)` : réservé au **locataire**. Le bien doit
  être `approved` et non supprimé ; le locataire ne peut pas contacter son propre
  bien. Upsert conversation par `{propertyId, tenantId}` (gestion du doublon
  `11000` par relecture), insertion du premier message, mise à jour de
  `lastMessageAt` / `lastMessagePreview` et inc `ownerUnread`.
- `sendMessage(conversationId, body)` : **locataire** ou **propriétaire**
  participant. Refus si le bien est supprimé (conversation en lecture seule).
- `getMessages(conversationId, after?)` : participants uniquement, 50 derniers
  messages ou messages postérieurs à `after`, ordre croissant, `isMine`, sans
  exposer le `senderId`.
- `markConversationRead(conversationId)` : met le compteur de l'utilisateur
  courant à zéro.
- `getUnreadTotal()` : total des messages non lus pour l'utilisateur connecté.

Schemas Zod (`lib/validations/conversation.ts`) : `startConversation`,
`sendMessage`, `markConversationRead`, `pollMessages`.

Rate limits : 20 messages / minute / utilisateur (compteur sur `Message`,
fenêtre glissante) et 5 nouvelles conversations / heure / locataire (compteur sur
`Conversation`).

### Requêtes (`lib/messages/queries.ts`)

- `listConversationsForTenant(userId)` / `listConversationsForOwner(userId)` :
  triés par `lastMessageAt` décroissant, avec titre du bien, ville, photo de
  couverture, nom du correspondant, compteur de non-lus, dernier extrait.
- `getConversationForParticipant(conversationId, userId, role)`.
- `getConversationByPropertyAndTenant(propertyId, tenantId)`.

### Polling (temps réel « near real time »)

Le composant partagé `app/dashboard/_components/ChatThread.tsx` interroge
`getMessages` toutes les **4 secondes** via une Server Action, avec `after` =
date de création du dernier message connu. Le polling est
visibility-aware : aucune interrogation quand l'onglet est masqué, fetch
immédiat au retour de la visibilité, backoff à **15 secondes** après 3 erreurs
consécutives, nettoyage du timer au démontage, déduplication par identifiant de
message et `markConversationRead` à l'arrivée de messages entrants.

### Expérience de conversation

Les fils occupent la hauteur de la fenêtre, avec en-tête et compositeur fixes,
et une liste de messages défilante. Ils affichent le logement, le type, la ville,
le correspondant (l'autre participant uniquement), un lien vers l'annonce et un
lien « Quitter la discussion » qui revient à la liste sans supprimer de données.
Les messages sont groupés par jour et par auteur ; les envois optimistes
affichent leur état d'envoi et peuvent être réessayés en cas d'échec. Le bouton
« Nouveaux messages » apparaît lorsqu'un nouveau message arrive pendant que le
lecteur est remonté dans l'historique.

Le compositeur grandit jusqu'à cinq lignes. Entrée envoie le message et
Maj+Entrée insère une nouvelle ligne ; la limite est de 1000 caractères. Si
l'annonce a été supprimée, le fil reste consultable en lecture seule et
l'envoi est désactivé.

### Confidentialité

Ni l'e-mail, ni le téléphone, ni les identifiants du propriétaire/locataire ne
sont exposés dans les listes ou les fils : seul le prénom de l'autre participant
est affiché, sinon « Propriétaire » / « Locataire ». Les actions de lecture,
d'envoi et de marquage comme lu sont réservées aux participants locataire et
propriétaire ; un administrateur ne peut pas lire ni écrire les messages.

### Limitations

La messagerie est un polling (4 s) : un vrai push (SSE / WebSocket) nécessiterait une
décision d'équipe (interdiction d'ajouter socket.io / ws / SSE / route handler).

## Inventaire des fonctionnalités

Cette liste sert de référence avant toute modification : chaque fonctionnalité
doit rester présente après un changement, même purement visuel.

| Fonctionnalité | Fichier(s) |
| --- | --- |
| Recherche locataire (filtres, tri, pagination) | `app/dashboard/tenant/properties/page.tsx`, `lib/properties/public-queries.ts`, `lib/validations/property-search.ts` |
| Bouton favori (liste + détail + favoris) | `app/dashboard/tenant/properties/_components/FavoriteButton.tsx`, `lib/properties/favorite-queries.ts`, `app/actions/favorites.ts` |
| Page « Mes favoris » | `app/dashboard/tenant/favorites/page.tsx` |
| Signalement d'annonce | `app/dashboard/tenant/properties/_components/ReportPropertyForm.tsx`, `app/actions/reports.ts`, `lib/validations/report.ts` |
| Comptage des vues | `app/dashboard/tenant/properties/_components/RecordPropertyView.tsx`, `app/actions/property-views.ts` |
| Contact propriétaire / conversation | `app/dashboard/tenant/properties/_components/ContactOwnerForm.tsx`, `app/actions/messages.ts`, `lib/messages/queries.ts` |
| Messagerie locataire et propriétaire | `app/dashboard/tenant/messages/**`, `app/dashboard/owner/messages/**`, `app/dashboard/_components/ChatThread.tsx`, `app/dashboard/_components/ConversationList.tsx`, `models/conversation.ts`, `models/Message.ts` |
| Badge de messages non lus | `app/dashboard/_components/UnreadMessagesBadge.tsx`, `app/actions/messages.ts` (`getUnreadTotal`), `lib/messages/queries.ts` (`getUnreadTotal`) |
| Navigation locataire (en-têtes + barre mobile) | `app/dashboard/tenant/page.tsx`, `app/dashboard/tenant/properties/page.tsx`, `app/dashboard/tenant/properties/[id]/page.tsx`, `app/dashboard/tenant/favorites/page.tsx`, `app/_components/BottomNav.tsx` |
| Statistiques propriétaire (vues, favoris) | `app/dashboard/owner/properties/page.tsx`, `lib/properties/owner-stats.ts` |
| Gestion propriétaire (couverture, badges, motif, actions) | `app/dashboard/owner/properties/page.tsx`, `app/dashboard/owner/properties/_components/**` |
| Génération de description | `app/actions/property-description.ts`, `lib/properties/description-generator.ts`, `app/dashboard/owner/properties/_components/PropertyForm.tsx` |
| Tableau de bord administrateur | `app/dashboard/admin/page.tsx`, `app/dashboard/admin/_components/AdminHeader.tsx`, `app/dashboard/admin/_components/adminModules.ts` |
| Modération des annonces et signalements | `app/dashboard/admin/properties/page.tsx`, `app/dashboard/admin/properties/_components/ModerationCard.tsx`, `app/dashboard/admin/properties/_components/ReportModerationCard.tsx`, `app/actions/moderation.ts`, `lib/properties/admin-queries.ts` |
| Compteurs de modération (même source pour le hub et les onglets) | `lib/properties/admin-queries.ts` (`getModerationCounts`) |
| Indicateur de prix (prix/m² vs médiane) | `lib/properties/price-insight.ts`, `app/dashboard/_components/PriceInsightBadge.tsx` |
| Score de qualité des annonces | `lib/properties/quality-score.ts`, `app/dashboard/_components/QualityScoreBadge.tsx` |
| Recherche en langage naturel | `app/dashboard/tenant/properties/_components/NaturalSearchBar.tsx`, `app/actions/natural-search.ts`, `lib/properties/natural-search.ts`, `lib/validations/natural-search.ts` |

## Indicateur de prix

L'indicateur compare le prix au m² d'une annonce à la médiane des annonces
approuvées comparables. Il est calculé côté serveur par
`lib/properties/price-insight.ts` et affiché par
`app/dashboard/_components/PriceInsightBadge.tsx` sur les cartes locataire,
la page de détail, les cartes « Mes logements » du propriétaire et les cartes
de modération administrateur.

### Méthode

Une seule agrégation MongoDB est exécutée par page (jamais une requête par
annonce). Le `$match` retient `moderationStatus: "approved"`, `deletedAt: null`,
les villes de la page, `surface > 0` et `price > 0`. Le `$group` regroupe par
ville et par type en poussant le ratio `price / surface`. La médiane est
calculée en JavaScript : valeur centrale pour un échantillon impair, moyenne
des deux valeurs centrales pour un échantillon pair.

### Échantillons et seuils

- Au moins **5** comparables (annonce elle-même exclue) dans la même ville et
  le même type : l'indicateur utilise cette médiane (`scope: "city_type"`).
- Sinon, repli sur la médiane de la ville tous types confondus, avec au moins
  **8** comparables (`scope: "city"`).
- Sinon, aucun badge n'est affiché.
- Ratio `< 0.85` : « Bon prix » (vert).
- Ratio `0.85` à `1.15` : « Dans la moyenne » (gris).
- Ratio `> 1.15` : « Au-dessus du marché » (ambre).

Les terrains (`type: "land"`) et les annonces dont le prix ou la surface est
manquant ou nul sont ignorés. Côté administrateur, un ratio `> 1.15` ou `< 0.5`
est signalé en rouge comme « Prix suspect ».

### Confidentialité et limites

Seuls la médiane, le ratio et la taille de l'échantillon sortent du module :
aucune donnée d'une autre annonce n'est exposée. Un petit échantillon rend
l'estimation peu fiable ; il s'agit d'une estimation indicative, pas d'une
expertise immobilière.

## Score de qualité

Le score est calculé par `lib/properties/quality-score.ts`, une fonction pure,
déterministe, sans accès à la base et sans écriture. Il est calculé à la volée
depuis l'annonce déjà chargée par la page ; aucun champ n'est ajouté au modèle.
Il est affiché par `app/dashboard/_components/QualityScoreBadge.tsx` sur les
cartes « Mes logements », en haut de la page d'édition et, à titre informatif,
sur les cartes de modération administrateur. Il n'est jamais montré aux
locataires.

### Barème (total exactement 100)

| Critère | Barème | Points max |
| --- | --- | --- |
| Photos | 0 => 0, 1-2 => 8, 3-4 => 16, 5-6 => 25 | 25 |
| Photo de couverture | définie => 5 | 5 |
| Description | >= 150 caractères => 15, >= 300 => 20 | 20 |
| Équipements | >= 3 => 10, >= 6 => 15 | 15 |
| Zone | renseignée => 5 | 5 |
| Chambres + salles de bain | renseignées => 10 (10 d'office pour terrain/bureau) | 10 |
| Règles de location | renseignées => 5 | 5 |
| Date de disponibilité | renseignée => 5 | 5 |
| Coordonnées | présentes => 5 | 5 |
| Adresse | >= 10 caractères => 5 | 5 |
| **Total** | | **100** |

### Niveaux et conseils

- `< 50` : « À améliorer » (faible).
- `50` à `79` : « Correct ».
- `>= 80` : « Excellent ».

Les conseils correspondent aux critères non satisfaits, triés par points
décroissants et affichés dans le panneau « Comment améliorer cette annonce ».
Le score ne sert jamais au classement des annonces ni à une décision de
modération : côté administrateur, c'est une information parmi d'autres.

## Recherche en langage naturel

La barre `app/dashboard/tenant/properties/_components/NaturalSearchBar.tsx`
est placée au-dessus et en dehors du formulaire de filtres existant (aucun
formulaire imbriqué). Elle appelle l'action serveur
`app/actions/natural-search.ts`, qui valide le texte, applique une limite de
débit, lit la liste des villes approuvées, puis délègue l'interprétation à
`lib/properties/natural-search.ts`.

### Fonctionnement

Le texte est converti en filtres existants, puis validé par
`propertySearchSchema` (`lib/validations/property-search.ts`). Les valeurs sont
ensuite sérialisées avec les mêmes noms de paramètres que le formulaire GET
(`city`, `zone`, `priceMin`, `priceMax`, `surfaceMin`, `surfaceMax`,
`bedrooms`, `bathrooms`, `type`, `equipment_<clé>`, `sort`) et la page navigue
vers `/dashboard/tenant/properties?<queryString>`. Aucune requête MongoDB n'est
construite à partir du texte ni de la réponse du modèle.

### Vocabulaire du parseur de règles

- Types : appartement/appart, maison, studio, villa, bureau/office, terrain.
- Villes : uniquement celles présentes dans les annonces approuvées.
- Prix : « moins de », « max », « jusqu'à », « budget », « < », « plus de »,
  « à partir de », « min », « > », « entre X et Y », nombres suivis de `dt`,
  `dinars`, `tnd` ou `k` (`1.5k` = 1500).
- Chambres : « 3 chambres », « 3 ch », notation tunisienne `S+N` (`S+2` = 2
  chambres, `S+0` ou studio = 0).
- Salles de bain : « 2 salles de bain », « 2 sdb ».
- Surface : « 100 m2 », « plus de 80 m² ».
- Équipements : parking, ascenseur, climatisation/clim, chauffage, meublé,
  balcon, jardin, internet/wifi, piscine, sécurité, terrasse.
- Tri : « moins cher » / « pas cher » => loyer croissant, « plus cher » =>
  loyer décroissant, « plus récent » => plus récents.

### IA optionnelle et repli

Si `ANTHROPIC_API_KEY` est défini, un appel `fetch` direct à l'API Anthropic
est tenté (modèle `ANTHROPIC_MODEL`, valeur par défaut `claude-haiku-5-5`,
`max_tokens` 300, timeout 8 s). La réponse doit être un JSON valide utilisant
les clés et énumérations autorisées ; elle est analysée défensivement puis
validée par le schéma existant. Aucune clé, aucun en-tête, aucun texte
utilisateur et aucune réponse brute ne sont journalisés.

Si la clé est absente, si l'appel échoue ou dépasse le délai, ou si le JSON est
invalide, le parseur de règles est utilisé seul. La fusion donne la priorité à
l'IA puis complète les champs manquants avec les règles ; la fonction ne lève
jamais d'exception vers l'interface.

### Sécurité et limites

La recherche est réservée aux locataires, le texte est limité à 3–300
caractères, et une limite de 20 recherches par utilisateur et par heure est
appliquée via une `Map` en mémoire (remise à zéro au redémarrage du serveur,
non partagée entre instances). Les expressions régulières sont échappées. Les
villes inconnues sont ignorées. L'IA peut mal interpréter une demande : la
recherche reste une aide, pas une garantie de résultats.


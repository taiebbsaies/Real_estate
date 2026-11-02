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

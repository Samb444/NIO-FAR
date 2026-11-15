# Messages vocaux en wolof (pré-enregistrés)

NIO FAR **ne génère aucune voix wolof synthétique**. Les messages de statut en wolof doivent être
enregistrés par un locuteur natif, puis relus et validés.

## Fichiers attendus

| Statut       | Nom de fichier suggéré | Texte français de référence                                                   |
| ------------ | ---------------------- | ----------------------------------------------------------------------------- |
| `recu`       | `statut-recu.mp3`      | Votre signalement a bien été reçu.                                            |
| `a_verifier` | `statut-a-verifier.mp3`| Votre signalement est en cours de vérification.                               |
| `transmis`   | `statut-transmis.mp3`  | Votre signalement a été transmis aux acteurs compétents.                      |
| `en_cours`   | `statut-en-cours.mp3`  | Une intervention est en cours.                                                |
| `resolu`     | `statut-resolu.mp3`    | Le problème est déclaré résolu. Pouvez-vous confirmer qu’il est vraiment réglé ? |

## Activation

1. Déposez les fichiers (MP3 ou OGG, mono, < 100 Ko) dans ce dossier.
2. Déclarez-les dans `manifest.json`, par exemple :

```json
{ "fichiers": { "recu": "statut-recu.mp3", "resolu": "statut-resolu.mp3" } }
```

Le bouton « Écouter en wolof » n'apparaît que pour les statuts déclarés.

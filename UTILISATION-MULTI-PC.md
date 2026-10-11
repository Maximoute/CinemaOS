# Cinema OS sur plusieurs PC

La base personnelle utilisée par Cinema OS est `data/library.json`. Comme ce fichier se trouve dans le dossier du projet, OneDrive le synchronise avec le reste de Cinema OS.

Sur chaque PC :

1. Dans OneDrive, choisissez **Toujours conserver sur cet appareil** pour le dossier `cinema-os`.
2. Installez Node.js 22 ou une version plus récente.
3. Attendez que OneDrive affiche une coche verte avant d'ouvrir `Lancer-CinemaOS.cmd`.
4. Après une modification importante, fermez Cinema OS et attendez de nouveau la coche verte avant de l'ouvrir sur l'autre PC.

Cinema OS relit désormais automatiquement une version de la base reçue par OneDrive, sans nécessiter de redémarrage. Évitez toutefois de modifier la bibliothèque simultanément sur deux PC : OneDrive synchronise des fichiers, mais ne remplace pas un véritable serveur de base de données et peut créer une copie en conflit.

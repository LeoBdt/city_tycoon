# 🏙️ City Tycoon - Ultimate Edition

**Un jeu de destruction et de construction physique en temps réel.**

Gérez votre budget, accomplissez des missions de démolition stratégique et reconstruisez la ville de vos rêves sur les décombres de l'ancienne.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎮 Fonctionnalités Clés

*   **Physique Avancée (Optimisée)** 🧱 : Chaque bâtiment est composé de voxels indépendants qui réagissent de manière réaliste aux explosions et à la gravité. Le tout optimisé pour tourner à 60 FPS (suppression automatique des débris, pixel ratio dynamique).
*   **Outils de Destruction Variés** 💥 :
    *   **Boule (Gratuit)** : Pour la démolition de précision.
    *   **Missile (100$)** : Rapide et efficace pour les structures moyennes.
    *   **Nuke (2000$)** : L'arme ultime pour tout raser (rayon massif).
*   **Système Économique** 💰 : La destruction vous rapporte de l'argent ! Utilisez vos gains pour acheter des armes plus puissantes ou reconstruire des bâtiments plus rentables.
*   **5 Niveaux Progressifs** 📈 :
    1.  **Tutoriel** : Apprenez les bases.
    2.  **Quartier Résidentiel** : Atteignez le score cible.
    3.  **Zone Industrielle** : Nettoyez les usines.
    4.  **Centre-Ville** : Attaquez-vous aux gratte-ciels.
    5.  **Chaos Final** : Liberté totale.
*   **Audio Mélodique** 🎵 : Une ambiance sonore procédurale apaisante, avec des sons harmonieux pour chaque interaction.

## 🕹️ Contrôles

*   **Clic Gauche** : Utiliser l'outil sélectionné (Tirer / Construire).
*   **Clic Droit + Glisser** : Faire tourner la caméra.
*   **Molette** : Zoomer / Dézoomer.
*   **Interface** : Sélectionnez les niveaux, mettez en pause ou changez d'outil via l'interface HUD.

## 🚀 Installation & Lancement

1.  **Pré-requis** : Node.js installé.
2.  **Installation** :
    ```bash
    npm install
    ```
3.  **Lancement (Développement)** :
    ```bash
    npm run dev
    ```
    Le jeu sera accessible sur `http://localhost:5173`.

## 🛠️ Optimisations Techniques

Ce projet utilise `Three.js` pour le rendu et `Cannon-es` pour la physique. Pour garantir la fluidité sur navigateur :
*   **Instant Cleanup** : Les débris touchant le sol sont supprimés instantanément.
*   **Physique Low-Poly** : Utilisation de boîtes de collision simplifiées.
*   **Anti-Tunneling** : Sol épais et paramètres physiques ajustés (substeps).
*   **Rendu Optimisé** : Désactivation des ombres complexes et de l'antialiasing pour privilégier le nombre d'objets.

---
*Fait avec ❤️ par Leo Bidot

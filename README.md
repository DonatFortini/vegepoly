# VégéPoly - Générateur de Végétation Naturelle

VégéPoly est un outil de génération de végétation qui utilise l'algorithme d'échantillonnage Poisson Disc pour créer des distributions naturelles de végétation à l'intérieur de polygones géographiques définis.

## Description

VégéPoly permet de générer des points de végétation (arbres, surfaces, roccailles) à partir de fichiers CSV contenant des données de polygones. L'outil utilise une interface utilisateur intuitive pour ajuster les paramètres et visualiser les résultats avant de finaliser le traitement.

## Fonctionnalités

- Importation de fichiers CSV contenant des données de polygones
- Génération de points de végétation à l'aide de l'algorithme d'échantillonnage Poisson Disc
- Contrôle des paramètres de densité et de variation
- Support pour différents types de végétation (arbres, surfaces, roccailles)
- Prévisualisation des polygones et des points générés
- Exportation des résultats dans un format compatible

## Installation

```bash
# Cloner le dépôt
git clone git@github.com:DonatFortini/vegepoly.git
cd vegepoly

# Installer les dépendances
bun install

# Lancer l'application en mode développement
bun run tauri dev

# alternativement avec cargo
cargo install create-tauri-app --locked
cargo tauri dev
```

## Utilisation

1. Sélectionnez un fichier CSV contenant des données de polygone
2. Choisissez le type de végétation à générer
3. Ajustez les paramètres de densité et de variation
4. Visualisez les polygones et les points générés
5. Exportez les résultats dans un format txt

## Complexité Temporelle de l'Algorithme d'Échantillonnage

L'algorithme d'échantillonnage Poisson Disc implémenté dans `sampling.rs` présente les caractéristiques de complexité suivantes :

### Initialisation

- **Construction du Sampler** : O(1) - La création de l'instance du sampler est une opération constante.
- **Initialisation de la grille** : O(W × H) où W et H sont la largeur et la hauteur de la grille. Cette opération alloue l'espace mémoire pour la grille qui optimise la recherche de voisinage.

### Génération de Distribution

- **Placement du premier point** : O(k) où k est le nombre maximum de tentatives pour placer un point initial (limité à 100 dans l'implémentation actuelle).

- **Génération des points suivants** :

  - Dans le pire cas : O(n × m × c) où :
    - n est le nombre de points générés
    - m est le nombre maximal de tentatives par point (défini par `max_attempts`, ici 30)
    - c est la complexité de vérification de validité d'un point

- **Vérification de la validité d'un point** (`is_point_valid`) :
  - O(k²) où k est le nombre de cellules voisines vérifiées (généralement 9 cellules dans une grille 2D)
  - Cette opération est optimisée par l'utilisation d'une grille accélératrice qui divise l'espace en cellules de taille appropriée pour limiter les comparaisons

### Complexité globale

La complexité globale de l'algorithme est approximativement O(n × m) où n est le nombre de points générés et m est le nombre maximal de tentatives.

Dans la pratique, la performance est généralement meilleure que cette borne supérieure grâce à plusieurs optimisations :

1. L'utilisation d'une grille accélératrice qui limite les comparaisons de distance à un petit nombre de voisins potentiels
2. La taille des cellules de la grille est optimisée (`cell_size = min_distance / √2`) pour garantir qu'une cellule ne peut contenir qu'un seul point valide
3. L'utilisation d'une liste de points "actifs" qui permet de ne considérer que les points pouvant potentiellement générer de nouveaux voisins

Ces optimisations font que l'algorithme reste efficace même pour la génération d'un grand nombre de points, avec une complexité pratique souvent plus proche de O(n) que O(n²).

## Licence

[MIT](LICENSE)

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## Remerciements

- L'implémentation de l'algorithme Poisson Disc est inspirée des travaux de Robert Bridson sur l'échantillonnage par disques de Poisson.

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

L'algorithme d'échantillonnage Poisson Disc implémenté dans `sampling.rs` présente une analyse de complexité détaillée :

### Initialisation

- **Construction du Sampler** : O(1) - La création de l'instance du sampler est une opération constante.
- **Initialisation de la grille** : O(W × H) où W et H sont la largeur et la hauteur de la grille calculées à partir des dimensions du polygone et de la distance minimale.

### Génération de Distribution

Pour chaque polygone dans le fichier CSV :

#### Placement du premier point initial

- **Meilleur cas** : O(1) si le premier point aléatoire est valide (à l'intérieur du polygone)
- **Pire cas** : O(k) où k est le nombre maximum de tentatives (100 dans l'implémentation actuelle)
- **Cas moyen** : Dépend de la forme du polygone, généralement proche de O(1) pour des polygones de forme raisonnable

#### Boucle principale de génération de points

- Pour chaque point actif, l'algorithme tente de placer de nouveaux points dans son voisinage
- Nombre total d'itérations : O(n) où n est le nombre final de points générés

#### Pour chaque itération

- **Génération d'un point aléatoire** : O(1)
- **Vérification de validité** (`is_point_valid`) :
  - **Meilleur cas** : O(1) quand la grille élimine efficacement la plupart des vérifications
  - **Pire cas** : O(k²) où k est le nombre de cellules voisines vérifiées (généralement 9 dans une grille 2D)
  - **Cas moyen** : O(1) grâce à la structure d'accélération par grille

### Complexité globale pour p polygones

- **Meilleur cas** : O(p × n) où p est le nombre de polygones et n le nombre moyen de points par polygone
- **Pire cas** : O(p × n × m × k²) où :
  - p est le nombre de polygones
  - n est le nombre de points générés par polygone
  - m est le nombre maximal de tentatives par point (30)
  - k² est le coût de vérification de validité dans le pire cas
- **Cas moyen en pratique** : O(p × n) grâce aux optimisations implémentées

L'algorithme reste hautement efficace en pratique grâce à plusieurs optimisations clés :

1. **Grille d'accélération spatiale** : La taille des cellules (`cell_size = min_distance / √2`) est optimisée pour garantir qu'une cellule ne peut contenir qu'un seul point valide, ce qui réduit drastiquement le nombre de comparaisons de distance nécessaires.

2. **Liste de points actifs** : L'algorithme maintient une liste de points "actifs" qui peuvent potentiellement générer de nouveaux voisins, évitant ainsi de reconsidérer des régions déjà saturées.

3. **Interruption précoce** : La vérification de validité s'arrête dès qu'une violation de la distance minimale est détectée.

4. **Optimisation de recherche de voisinage** : Seules les cellules adjacentes dans la grille sont vérifiées, réduisant considérablement l'espace de recherche.

Ces optimisations font que l'algorithme maintient une excellente performance même pour la génération d'un grand nombre de points dans des polygones complexes ou pour le traitement de fichiers CSV contenant de nombreux polygones.

## Licence

[MIT](LICENSE)

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## Remerciements

- L'implémentation de l'algorithme Poisson Disc est inspirée des travaux de Robert Bridson sur l'échantillonnage par disques de Poisson.

use geo::{Contains, Point, Polygon};
use rand::Rng;

/// Structure qui implémente l'algorithme d'échantillonnage de distribution spatiale.
/// Utilise une grille pour optimiser la détection de voisinage lors de l'échantillonnage.
pub struct SpatialDistributionSampler {
    /// Distance minimale entre les points (en unités spatiales)
    min_distance: f64,
    /// Nombre maximum de tentatives pour trouver un nouveau point valide
    max_attempts: usize,
    /// Taille de la cellule de la grille (dérivée de la distance minimale)
    cell_size: f64,
    /// Largeur de la grille en nombre de cellules
    grid_width: usize,
    /// Hauteur de la grille en nombre de cellules
    grid_height: usize,
    /// Grille pour optimiser la recherche de voisins (stocke les indices des points)
    grid: Vec<Option<usize>>,
    /// Collection des points générés
    points: Vec<Point<f64>>,
    /// Indices des points actifs pour la génération de nouveaux points
    active_indices: Vec<usize>,
    /// Limites de la zone d'échantillonnage (min_x, min_y, max_x, max_y)
    bounds: (f64, f64, f64, f64),
}

impl SpatialDistributionSampler {
    /// Crée un nouveau sampler de distribution spatiale avec les paramètres spécifiés.
    ///
    /// # Arguments
    /// * `min_distance` - Distance minimale entre deux points quelconques
    /// * `bounds` - Tuple (min_x, min_y, max_x, max_y) définissant les limites de la zone
    pub fn new(min_distance: f64, bounds: (f64, f64, f64, f64)) -> Self {
        let (min_x, min_y, max_x, max_y) = bounds;
        let width = max_x - min_x;
        let height = max_y - min_y;

        // La taille de cellule est calculée pour garantir qu'une cellule ne peut contenir
        // qu'un seul point respectant la distance minimale
        let cell_size = min_distance / std::f64::consts::SQRT_2;

        let grid_width = (width / cell_size).ceil() as usize + 1;
        let grid_height = (height / cell_size).ceil() as usize + 1;

        SpatialDistributionSampler {
            min_distance,
            max_attempts: 30,
            cell_size,
            grid_width,
            grid_height,
            grid: vec![None; grid_width * grid_height],
            points: Vec::new(),
            active_indices: Vec::new(),
            bounds,
        }
    }

    /// Génère une distribution de points à l'intérieur du polygone donné.
    /// Utilise un algorithme de disque de Poisson modifié pour respecter la distance minimale.
    ///
    /// # Arguments
    /// * `polygon` - Le polygone dans lequel générer les points
    ///
    /// # Retours
    /// Un vecteur de points respectant la distance minimale et contenus dans le polygone
    pub fn generate_distribution(&mut self, polygon: &Polygon<f64>) -> Vec<Point<f64>> {
        let mut rng = rand::rng();
        let (min_x, min_y, max_x, max_y) = self.bounds;

        // Place un point initial aléatoire à l'intérieur du polygone
        for _ in 0..100 {
            let x = min_x + rng.random::<f64>() * (max_x - min_x);
            let y = min_y + rng.random::<f64>() * (max_y - min_y);
            let point = Point::new(x, y);

            if polygon.contains(&point) {
                self.add_point(point);
                break;
            }
        }

        if self.active_indices.is_empty() {
            return Vec::new();
        }

        // Itère tant qu'il reste des points actifs
        while !self.active_indices.is_empty() {
            // Sélectionne aléatoirement un point actif
            let idx = rng.random_range(0..self.active_indices.len());
            let active_idx = self.active_indices[idx];
            let active_point = self.points[active_idx];

            let mut found_new_point = false;

            // Tente de placer un nouveau point autour du point actif
            for _ in 0..self.max_attempts {
                // Génère une position aléatoire autour du point actif
                let angle = 2.0 * std::f64::consts::PI * rng.random::<f64>();
                let radius = self.min_distance + self.min_distance * rng.random::<f64>();

                let new_x = active_point.x() + radius * angle.cos();
                let new_y = active_point.y() + radius * angle.sin();

                // Vérifie si le nouveau point est dans les limites
                if new_x < min_x || new_x >= max_x || new_y < min_y || new_y >= max_y {
                    continue;
                }

                let new_point = Point::new(new_x, new_y);

                // Vérifie si le point est à l'intérieur du polygone et respecte la distance minimale
                if polygon.contains(&new_point) && self.is_point_valid(&new_point) {
                    self.add_point(new_point);
                    found_new_point = true;
                    break;
                }
            }

            // Si aucun nouveau point n'a été trouvé, retire ce point de la liste des points actifs
            if !found_new_point {
                self.active_indices.swap_remove(idx);
            }
        }

        self.points.clone()
    }

    /// Ajoute un point à la distribution et met à jour les structures de données.
    ///
    /// # Arguments
    /// * `point` - Le point à ajouter
    fn add_point(&mut self, point: Point<f64>) {
        let idx = self.points.len();
        self.points.push(point);

        // Ajoute l'indice aux points actifs
        self.active_indices.push(idx);

        // Calcule la position du point dans la grille
        let (min_x, min_y, _, _) = self.bounds;
        let grid_x = ((point.x() - min_x) / self.cell_size) as usize;
        let grid_y = ((point.y() - min_y) / self.cell_size) as usize;

        // Enregistre la position du point dans la grille
        if grid_x < self.grid_width && grid_y < self.grid_height {
            let grid_idx = grid_y * self.grid_width + grid_x;
            if grid_idx < self.grid.len() {
                self.grid[grid_idx] = Some(idx);
            }
        }
    }

    /// Vérifie si un point est valide en termes de distance minimale avec les points existants.
    ///
    /// # Arguments
    /// * `point` - Le point à vérifier
    ///
    /// # Retours
    /// `true` si le point respecte la distance minimale par rapport à tous les points existants
    fn is_point_valid(&self, point: &Point<f64>) -> bool {
        let (min_x, min_y, _, _) = self.bounds;

        // Calcule la position du point dans la grille
        let grid_x = ((point.x() - min_x) / self.cell_size) as usize;
        let grid_y = ((point.y() - min_y) / self.cell_size) as usize;

        // Vérifie uniquement les cellules voisines pour optimiser la recherche
        let start_x = if grid_x > 1 { grid_x - 1 } else { 0 };
        let start_y = if grid_y > 1 { grid_y - 1 } else { 0 };
        let end_x = (grid_x + 1).min(self.grid_width - 1);
        let end_y = (grid_y + 1).min(self.grid_height - 1);

        // Itère sur les cellules voisines
        for y in start_y..=end_y {
            for x in start_x..=end_x {
                let idx = y * self.grid_width + x;
                if idx < self.grid.len() {
                    // Si une cellule contient un point, vérifie la distance
                    if let Some(point_idx) = self.grid[idx] {
                        let other = &self.points[point_idx];
                        let dx = point.x() - other.x();
                        let dy = point.y() - other.y();
                        let dist_sq = dx * dx + dy * dy;

                        // Rejette le point s'il est trop proche d'un point existant
                        if dist_sq < self.min_distance * self.min_distance {
                            return false;
                        }
                    }
                }
            }
        }

        true
    }
}

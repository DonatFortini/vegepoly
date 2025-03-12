import { invoke } from "@tauri-apps/api/core";
import { VegetationParams } from "../types";

// Interface pour les points
export interface Point {
  x: number;
  y: number;
}

// Interface pour les données de polygone
export interface PolygonData {
  polygon: Point[];
  points: Point[];
}

// Extraction des polygones et points à partir d'un fichier CSV via le backend
export async function extractPolygonData(
  filePath: string,
  params: VegetationParams
): Promise<PolygonData> {
  try {
    // Appel à la fonction backend qui extrait les données du polygone et des points
    const data = await invoke<PolygonData>("extract_polygon_data", {
      csvPath: filePath,
      params,
    });

    return data;
  } catch (error) {
    console.error(
      "Erreur lors de l'extraction des données du polygone:",
      error
    );
    return { polygon: [], points: [] };
  }
}

// Fonction d'aide pour parser les coordonnées de polygone depuis un fichier WKT
export function parsePolygonFromWkt(wktString: string): Point[] {
  // Extraction des coordonnées depuis la chaîne POLYGON((x1 y1, x2 y2, ...))
  const coordsMatch = wktString.match(/POLYGON\(\((.*?)\)\)/);
  if (!coordsMatch || !coordsMatch[1]) return [];

  const coordsString = coordsMatch[1];
  const coordPairs = coordsString.split(",").map((pair) => pair.trim());

  return coordPairs.map((pair) => {
    const [x, y] = pair.split(" ").map(parseFloat);
    return { x, y };
  });
}

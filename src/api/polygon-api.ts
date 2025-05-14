import { invoke } from "@tauri-apps/api/core";
import { VegetationParams } from "../types";

export interface Point {
  x: number;
  y: number;
}

export interface PolygonData {
  polygon: Point[];
  points: Point[];
}

export async function extractPolygonData(
  filePath: string,
  params: VegetationParams
): Promise<PolygonData> {
  try {
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

export function parsePolygonFromWkt(wktString: string): Point[] {
  const coordsMatch = wktString.match(/POLYGON\(\((.*?)\)\)/);
  if (!coordsMatch || !coordsMatch[1]) return [];

  const coordsString = coordsMatch[1];
  const coordPairs = coordsString.split(",").map((pair) => pair.trim());

  return coordPairs.map((pair) => {
    const [x, y] = pair.split(" ").map(parseFloat);
    return { x, y };
  });
}

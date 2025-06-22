export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  exterior: Point[];
  interiors: Point[][];
}

// Utility function to parse WKT strings (kept for potential future use)
export function parsePolygonFromWkt(wktString: string): Polygon {
  const coordsMatch = wktString.match(/POLYGON\s*\(\((.*?)\)\)/);
  if (!coordsMatch || !coordsMatch[1]) return { exterior: [], interiors: [] };

  // Handles only exterior ring for now
  const rings = wktString
    .replace(/POLYGON\s*\(\(/, "")
    .replace(/\)\)$/, "")
    .split("),(");

  const parseRing = (ring: string): Point[] =>
    ring
      .split(",")
      .map((pair) => pair.trim())
      .map((pair) => {
        const [x, y] = pair.split(" ").map(parseFloat);
        return { x, y };
      });

  const exterior = parseRing(rings[0]);
  const interiors = rings.slice(1).map(parseRing);

  return { exterior, interiors };
}
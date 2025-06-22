import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Card from "./shared/Card";
import { VegetationParams } from "../types";

interface Point {
  x: number;
  y: number;
}

interface Polygon {
  exterior: Point[];
  interiors: Point[][];
}

interface PolygonPreviewProps {
  result: string | null;
  selectedFile: string | null;
  isProcessing: boolean;
  isLoadingFile: boolean;
  params: VegetationParams;
  vegetationType: number;
  polygonCount: number;
}

const PolygonPreview = ({
  result,
  selectedFile,
  isProcessing,
  isLoadingFile,
  params,
  vegetationType,
  polygonCount,
}: PolygonPreviewProps) => {
  const [polygon, setPolygon] = useState<Polygon>({ exterior: [], interiors: [] });
  const [points, setPoints] = useState<Point[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPoints, setShowPoints] = useState<boolean>(true);

  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (selectedFile && polygonCount > 0 && !isLoadingFile && !isProcessing) {
      const loadPolygonAndPoints = async () => {
        setError(null);

        try {
          const [polygonData, previewPoints] = await invoke<[Polygon, Point[]]>("get_preview_data", {
            filePath: selectedFile,
            param: {
              ...params,
              vegetation_type: vegetationType,
            },
          });

          setPolygon(polygonData);
          setPoints(previewPoints);

          const allPolygonPoints = [...polygonData.exterior, ...polygonData.interiors.flat()];
          if (allPolygonPoints.length > 0) {
            const xValues = allPolygonPoints.map((p) => p.x);
            const yValues = allPolygonPoints.map((p) => p.y);
            const minX = Math.min(...xValues);
            const maxX = Math.max(...xValues);
            const minY = Math.min(...yValues);
            const maxY = Math.max(...yValues);

            const width = maxX - minX;
            const height = maxY - minY;
            const containerWidth = 400;
            const containerHeight = 300;
            const scaleX = containerWidth / (width + 40);
            const scaleY = containerHeight / (height + 40);
            const newScale = Math.min(scaleX, scaleY);
            setScale(newScale);

            setOffset({
              x: (containerWidth - width * newScale) / 2 - minX * newScale + 20,
              y: (containerHeight - height * newScale) / 2 - minY * newScale + 20,
            });
          }

        } catch (error) {
          console.error("Erreur lors du chargement des données:", error);
          setError("Erreur lors du chargement des données");
          setPolygon({ exterior: [], interiors: [] });
          setPoints([]);
        }
      };

      loadPolygonAndPoints();
    }
  }, [selectedFile, polygonCount, isLoadingFile, isProcessing, params, vegetationType]);

  useEffect(() => {
    if (!selectedFile) {
      setPolygon({ exterior: [], interiors: [] });
      setPoints([]);
      setError(null);
    }
  }, [selectedFile]);

  const polyPoints = polygon.exterior
    .map((p) => `${p.x * scale + offset.x},${p.y * scale + offset.y}`)
    .join(" ");

  const interiorsPolygons = polygon.interiors.map((ring, idx) => (
    <polygon
      key={idx}
      points={ring.map((p) => `${p.x * scale + offset.x},${p.y * scale + offset.y}`).join(" ")}
      fill="#fff"
      stroke="#6B9080"
      strokeWidth="1"
      opacity="0.5"
    />
  ));

  return (
    <Card title="Prévisualisation" className="flex-shrink-0 mb-3">
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showPoints"
              checked={showPoints}
              onChange={(e) => setShowPoints(e.target.checked)}
              disabled={isLoadingFile || points.length === 0}
              className="mr-2"
            />
            <label htmlFor="showPoints" className="text-sm">
              Afficher les points
            </label>
          </div>
          {polygonCount > 1 && (
            <div className="text-xs text-gray-600">
              Affichage du premier polygone ({polygonCount} total)
            </div>
          )}
        </div>

        <div className="w-full h-[300px] border border-gray-300 bg-white rounded-md overflow-hidden flex items-center justify-center">
          {isLoadingFile ? (
            <div className="text-gray-500">Chargement du fichier...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : polygon.exterior.length > 0 ? (
            <svg width="100%" height="100%" className="bg-gray-50">
              <polygon
                points={polyPoints}
                fill="#CCE3DE"
                stroke="#6B9080"
                strokeWidth="2"
                opacity="0.7"
              />
              {interiorsPolygons}
              {showPoints &&
                points.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x * scale + offset.x}
                    cy={point.y * scale + offset.y}
                    r="3"
                    fill="#6B9080"
                  />
                ))}
            </svg>
          ) : (
            <div className="text-gray-500">
              {isProcessing
                ? "Génération en cours..."
                : selectedFile
                  ? "Chargement du polygone..."
                  : "Sélectionnez un fichier CSV pour visualiser"}
            </div>
          )}
        </div>

        <div className="mt-3 text-sm w-full" id="medium-visibility">
          {isLoadingFile ? (
            <p>Chargement des données...</p>
          ) : polygonCount > 0 ? (
            <p>
              {polygonCount} polygone(s) chargé(s).{" "}
              {points.length > 0 && `${points.length} points de végétation générés pour la prévisualisation.`}
            </p>
          ) : result ? (
            <p>Le résultat a été généré</p>
          ) : selectedFile ? (
            <p>Prêt à générer des points dans le polygone chargé</p>
          ) : (
            <p>
              Cette vue montre une prévisualisation du polygone et des points
              générés
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PolygonPreview;
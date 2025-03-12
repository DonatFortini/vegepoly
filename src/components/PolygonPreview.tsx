import { useState, useEffect } from "react";
import Card from "./shared/Card";
import { extractPolygonData, Point } from "../api/polygon-api";
import { VegetationParams } from "../types";

interface PolygonPreviewProps {
  result: string | null;
  selectedFile: string | null;
  isProcessing: boolean;
  params: VegetationParams;
  vegetationType: number;
}

const PolygonPreview = ({
  result,
  selectedFile,
  isProcessing,
  params,
  vegetationType,
}: PolygonPreviewProps) => {
  const [polygon, setPolygon] = useState<Point[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPoints, setShowPoints] = useState<boolean>(true);

  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [_bounds, setBounds] = useState<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }>({
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
  });

  useEffect(() => {
    if (selectedFile && !isProcessing) {
      const loadPolygonData = async () => {
        setIsLoading(true);
        setError(null);

        try {
          const data = await extractPolygonData(selectedFile, {
            ...params,
            vegetation_type: vegetationType,
          });

          if (data.polygon.length > 0) {
            setPolygon(data.polygon);

            const xValues = data.polygon.map((p) => p.x);
            const yValues = data.polygon.map((p) => p.y);
            const minX = Math.min(...xValues);
            const maxX = Math.max(...xValues);
            const minY = Math.min(...yValues);
            const maxY = Math.max(...yValues);

            setBounds({ minX, minY, maxX, maxY });

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
              y:
                (containerHeight - height * newScale) / 2 -
                minY * newScale +
                20,
            });

            if (data.points.length > 0) {
              setPoints(data.points);
            } else {
              setPoints([]);
            }
          } else {
            setError("Aucun polygone trouvé dans le fichier");
          }
        } catch (error) {
          console.error(
            "Erreur lors du chargement des données de polygone:",
            error
          );
          setError("Erreur lors du chargement des données");
        } finally {
          setIsLoading(false);
        }
      };

      loadPolygonData();
    }
  }, [selectedFile, isProcessing, params, vegetationType]);

  useEffect(() => {
    if (result && polygon.length > 0 && !isProcessing) {
      const loadGeneratedPoints = async () => {
        setIsLoading(true);
        try {
          const data = await extractPolygonData(selectedFile || "", {
            ...params,
            vegetation_type: vegetationType,
          });

          if (data.points.length > 0) {
            setPoints(data.points);
          }
        } catch (error) {
          console.error("Erreur lors du chargement des points générés:", error);
          setError("Erreur lors du chargement des points générés");
        } finally {
          setIsLoading(false);
        }
      };

      loadGeneratedPoints();
    }
  }, [
    result,
    isProcessing,
    selectedFile,
    params,
    vegetationType,
    polygon.length,
  ]);

  const polyPoints = polygon
    .map((p) => `${p.x * scale + offset.x},${p.y * scale + offset.y}`)
    .join(" ");

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
              disabled={isLoading || points.length === 0}
              className="mr-2"
            />
            <label htmlFor="showPoints" className="text-sm">
              Afficher les points
            </label>
          </div>
        </div>

        <div className="w-full h-[300px] border border-gray-300 bg-white rounded-md overflow-hidden flex items-center justify-center">
          {isLoading ? (
            <div className="text-gray-500">Chargement en cours...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : polygon.length > 0 ? (
            <svg width="100%" height="100%" className="bg-gray-50">
              <polygon
                points={polyPoints}
                fill="#CCE3DE"
                stroke="#6B9080"
                strokeWidth="2"
                opacity="0.7"
              />
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
          {isLoading ? (
            <p>Chargement des données...</p>
          ) : points.length > 0 ? (
            <p>
              Prévisualisation de {points.length} points de végétation générés
            </p>
          ) : result ? (
            <p>Le résultat a été généré mais les points ne sont pas chargés</p>
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

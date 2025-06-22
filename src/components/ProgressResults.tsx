import { ProgressInfo } from "../types";
import Card from "./shared/Card";

interface ProgressResultsProps {
  isProcessing: boolean;
  result: string | null;
  progress: ProgressInfo;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

const ProgressResults = ({
  isProcessing,
  result,
  progress,
}: ProgressResultsProps) => {
  const percentage = progress.percentage || 0;

  return (
    <Card
      title="Progression et Résultats"
      className="mb-3 flex-grow overflow-auto"
    >
      {isProcessing && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h5 className="text-lg font-medium">Traitement en cours...</h5>
            <div className="text-lg font-bold text-blue-600">
              {percentage.toFixed(1)}%
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 my-2">
            <div
              className="h-4 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${percentage}%`,
              }}
              id="accent-primary"
            ></div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
            <div className="space-y-1">
              <div id="medium-visibility">
                Ligne {progress.current_row} sur {progress.total_rows}
              </div>
              {progress.created_items > 0 && (
                <div>
                  {progress.created_items.toLocaleString()} points générés
                </div>
              )}
            </div>

            <div className="space-y-1 text-right">
              {progress.elapsed_seconds !== undefined && (
                <div id="medium-visibility">
                  Temps écoulé: {formatTime(progress.elapsed_seconds)}
                </div>
              )}
              {progress.estimated_remaining_seconds !== undefined && (
                <div id="medium-visibility">
                  Temps restant: ~{formatTime(progress.estimated_remaining_seconds)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mb-4 bg-green-100 border-l-4 border-green-500 p-4 rounded">
          <h5 className="text-lg font-medium text-green-700">
            Traitement Terminé !
          </h5>
          <div className="mt-2 space-y-1">
            <p>Fichier de sortie créé : <span className="font-medium">{result}</span></p>
            <p>
              <span className="font-medium">{progress.created_items.toLocaleString()}</span> points
              de végétation générés avec l'échantillonnage Poisson disc
            </p>
            {progress.elapsed_seconds !== undefined && (
              <p>
                Temps total de traitement : <span className="font-medium">
                  {formatTime(progress.elapsed_seconds)}
                </span>
              </p>
            )}
            {progress.total_rows > 0 && (
              <p>
                <span className="font-medium">{progress.total_rows}</span> polygone(s) traité(s)
              </p>
            )}
          </div>
        </div>
      )}

      {progress.errors.length > 0 && (
        <div className="mt-4">
          <h5 className="text-lg font-medium text-red-700">
            Erreurs ({progress.errors.length})
          </h5>
          <div className="max-h-64 overflow-y-auto mt-2">
            {progress.errors.map((error, index) => (
              <div
                key={index}
                className="bg-red-100 border-l-4 border-red-500 p-3 rounded my-2 text-sm"
              >
                {error}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProgressResults;
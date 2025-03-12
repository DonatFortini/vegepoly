import { ProgressInfo } from "../types";
import Card from "./shared/Card";

interface ProgressResultsProps {
  isProcessing: boolean;
  result: string | null;
  progress: ProgressInfo;
}

const ProgressResults = ({
  isProcessing,
  result,
  progress,
}: ProgressResultsProps) => {
  return (
    <Card
      title="Progression et Résultats"
      className="mb-3 flex-grow overflow-auto"
    >
      {isProcessing && (
        <div className="mb-4">
          <h5 className="text-lg font-medium">Traitement en cours...</h5>
          <div className="w-full bg-gray-200 rounded-full h-4 my-2">
            <div
              className="h-4 rounded-full"
              style={{
                width: `${
                  progress.total_rows
                    ? (progress.current_row / progress.total_rows) * 100
                    : 0
                }%`,
              }}
              id="accent-primary"
            ></div>
          </div>
          <div className="mt-2" id="medium-visibility">
            Ligne {progress.current_row} sur {progress.total_rows}
          </div>
          {progress.created_items > 0 && (
            <div className="mt-2">
              Généré {progress.created_items} points de végétation
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="mb-4 bg-green-100 border-l-4 border-green-500 p-4 rounded">
          <h5 className="text-lg font-medium text-green-700">
            Traitement Terminé !
          </h5>
          <p>Fichier de sortie créé : {result}</p>
          <p>
            Généré {progress.created_items} points de végétation en utilisant
            l'échantillonnage Poisson disc
          </p>
        </div>
      )}

      {progress.errors.length > 0 && (
        <div className="mt-4">
          <h5 className="text-lg font-medium">
            Erreurs ({progress.errors.length})
          </h5>
          <div className="max-h-64 overflow-y-auto">
            {progress.errors.map((error, index) => (
              <div
                key={index}
                className="bg-red-100 border-l-4 border-red-500 p-4 rounded my-2"
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

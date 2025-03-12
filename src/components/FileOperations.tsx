import { faFileImport, faPlay } from "@fortawesome/free-solid-svg-icons";
import Card from "./shared/Card";
import Button from "./shared/Button";

interface FileOperationsProps {
  selectFile: () => void;
  executeProcessing: () => void;
  fileName: string | null;
  isProcessing: boolean;
  selectedFile: string | null;
}

const FileOperations = ({
  selectFile,
  executeProcessing,
  fileName,
  isProcessing,
  selectedFile,
}: FileOperationsProps) => {
  return (
    <Card title="Opérations de Fichier" className="flex-shrink-0">
      <div className="flex items-center mb-3 flex-wrap gap-2">
        <Button
          onClick={selectFile}
          disabled={isProcessing}
          icon={faFileImport}
          variant="primary"
        >
          Sélectionner CSV
        </Button>
        {fileName && (
          <div className="truncate max-w-full">Sélectionné: {fileName}</div>
        )}
      </div>

      <Button
        onClick={executeProcessing}
        disabled={isProcessing || !selectedFile}
        fullWidth
        icon={faPlay}
        variant="primary"
      >
        Exécuter
      </Button>
    </Card>
  );
};

export default FileOperations;

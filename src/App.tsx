import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { documentDir } from "@tauri-apps/api/path";
import "./App.css";

// Types
import { VegetationParams, ProgressInfo } from "./types";

// Components
import Header from "./components/Header";
import VegetationTypeSelector from "./components/VegetationTypeSelector";
import ParametersForm from "./components/ParametersForm";
import FileOperations from "./components/FileOperations";
import ProgressResults from "./components/ProgressResults";
import PolygonPreview from "./components/PolygonPreview";
import PoissonInfoPopup from "./components/popups/PoissonInfoPopup";
import ParamsGuidelinesPopup from "./components/popups/ParamsGuidelinesPopup";
import {
  getUserVegetationParams,
  paramsAreEqual,
  saveVegetationParams,
} from "./api/settings-api";

function App() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [polygonCount, setPolygonCount] = useState<number>(0);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [vegetationType, setVegetationType] = useState<number>(1);
  const [params, setParams] = useState<VegetationParams>({
    vegetation_type: 1,
    density: 7.0,
    type_value: 10,
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProgressInfo>({
    current_row: 0,
    total_rows: 0,
    created_items: 0,
    errors: [],
    percentage: 0,
    elapsed_seconds: undefined,
    estimated_remaining_seconds: undefined,
    is_finished: false,
  });
  const [result, setResult] = useState<string | null>(null);
  const [showTypeHelp, setShowTypeHelp] = useState<boolean>(false);
  const [showPoissonInfo, setShowPoissonInfo] = useState<boolean>(false);
  const [showParamsGuidelines, setShowParamsGuidelines] =
    useState<boolean>(false);
  const [savedParams, setSavedParams] = useState<VegetationParams | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  useEffect(() => {
    const loadParams = async () => {
      const userParams = await getUserVegetationParams(vegetationType);
      if (userParams) {
        setParams(userParams);
        setSavedParams(userParams);
        setHasChanges(false);
      } else {
        const defaults = await invoke<VegetationParams>(
          "get_default_vegetation_params",
          {
            vegetationType: vegetationType,
          }
        );
        setParams(defaults);
        setSavedParams(null);
        setHasChanges(true);
      }
    };

    loadParams();
  }, [vegetationType]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let unlistenFinished: (() => void) | null = null;
    let unlistenError: (() => void) | null = null;

    const setupListeners = async () => {
      unlistenFinished = await listen<string>('vegetation-export-finished', (event) => {
        setResult(event.payload);
        setIsProcessing(false);
      });

      unlistenError = await listen<string>('vegetation-export-error', (event) => {
        console.error("Processing failed:", event.payload);
        alert("Une erreur est survenue pendant le traitement.");
        setIsProcessing(false);
      });

      try {
        unlisten = await listen<ProgressInfo>('vegetation-progress', (event) => {
          const progressInfo = event.payload;
          setProgress(progressInfo);

          if (progressInfo.is_finished || (
            progressInfo.current_row === progressInfo.total_rows &&
            progressInfo.total_rows > 0
          )) {
            setIsProcessing(false);
          }
        });
      } catch (error) {
        console.error("Failed to set up progress event listener:", error);
      }
    };

    setupListeners();

    return () => {
      if (unlisten) unlisten();
      if (unlistenFinished) unlistenFinished();
      if (unlistenError) unlistenError();
    };
  }, []);

  const selectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Fichiers CSV",
            extensions: ["csv"],
          },
        ],
        defaultPath: await documentDir(),
      });

      if (selected && !Array.isArray(selected)) {
        setSelectedFile(selected);
        const parts = selected.split(/[/\\]/);
        setFileName(parts[parts.length - 1]);

        setIsLoadingFile(true);
        try {
          const polygons = await invoke<any[]>("parse_csv_file", {
            filePath: selected,
          });
          setPolygonCount(polygons.length);
          console.log(`Loaded ${polygons.length} polygons from CSV`);
        } catch (error) {
          console.error("Erreur lors du parsing du fichier CSV:", error);
          alert(`Erreur lors du chargement du fichier: ${error}`);
          setPolygonCount(0);
          setSelectedFile(null);
          setFileName(null);
        } finally {
          setIsLoadingFile(false);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la sélection du fichier:", error);
    }
  };

  const loadDefaultParams = async (type: number) => {
    try {
      const defaults = await invoke<VegetationParams>(
        "get_default_vegetation_params",
        {
          vegetationType: type,
        }
      );
      setParams(defaults);
    } catch (error) {
      console.error(
        "Erreur lors du chargement des paramètres par défaut:",
        error
      );
    }
  };

  const saveUserParams = async () => {
    try {
      const paramsToSave = {
        ...params,
        vegetation_type: vegetationType,
      };
      const success = await saveVegetationParams(vegetationType, paramsToSave);
      if (success) {
        setSavedParams(paramsToSave);
        setHasChanges(false);
      }
      return success;
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des paramètres:", error);
      return false;
    }
  };

  const executeProcessing = async () => {
    if (!selectedFile || polygonCount === 0) {
      alert("Veuillez d'abord sélectionner un fichier !");
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setProgress({
      current_row: 0,
      total_rows: 0,
      created_items: 0,
      errors: [],
      percentage: 0,
      elapsed_seconds: undefined,
      estimated_remaining_seconds: undefined,
      is_finished: false,
    });

    try {
      const polygons = await invoke<any[]>("parse_csv_file", {
        filePath: selectedFile,
      });

      const output = await invoke<string>("export_results", {
        data: polygons,
        param: {
          ...params,
          vegetation_type: vegetationType,
        },
      });

      setResult(output);
    } catch (error) {
      console.error("Erreur lors du traitement du fichier:", error);
      alert(`Erreur: ${error}`);
      setIsProcessing(false);
    }
  };

  const handleParamChange = (param: keyof VegetationParams, value: string) => {
    const newParams = {
      ...params,
      [param]: parseFloat(value),
    };
    setParams(newParams);
    if (savedParams) {
      setHasChanges(!paramsAreEqual(newParams, savedParams));
    } else {
      setHasChanges(true);
    }
  };

  const toggleTypeHelp = () => setShowTypeHelp(!showTypeHelp);
  const togglePoissonInfo = () => setShowPoissonInfo(!showPoissonInfo);
  const toggleParamsGuidelines = () =>
    setShowParamsGuidelines(!showParamsGuidelines);

  return (
    <div className="flex flex-col w-full h-screen min-w-[1200px] min-h-[800px] overflow-hidden">
      <Header togglePoissonInfo={togglePoissonInfo} />

      <div className="flex flex-1 px-4 pb-4 overflow-hidden">
        {/* Panneau gauche */}
        <div className="w-1/2 pr-2 flex flex-col overflow-hidden">
          <VegetationTypeSelector
            vegetationType={vegetationType}
            setVegetationType={setVegetationType}
          />

          <ParametersForm
            params={params}
            handleParamChange={handleParamChange}
            loadDefaultParams={loadDefaultParams}
            saveUserParams={saveUserParams}
            vegetationType={vegetationType}
            isProcessing={isProcessing}
            toggleTypeHelp={toggleTypeHelp}
            toggleParamsGuidelines={toggleParamsGuidelines}
            hasChanges={hasChanges}
          />

          <FileOperations
            selectFile={selectFile}
            executeProcessing={executeProcessing}
            fileName={fileName}
            isProcessing={isProcessing || isLoadingFile}
            selectedFile={selectedFile}
          />
        </div>

        {/* Panneau droit */}
        <div className="w-1/2 pl-2 flex flex-col overflow-hidden">
          <ProgressResults
            isProcessing={isProcessing}
            result={result}
            progress={progress}
          />

          <PolygonPreview
            result={result}
            selectedFile={selectedFile}
            isProcessing={isProcessing}
            isLoadingFile={isLoadingFile}
            params={params}
            vegetationType={vegetationType}
            polygonCount={polygonCount}
          />
        </div>
      </div>
      {/* Popups */}
      <PoissonInfoPopup isOpen={showPoissonInfo} onClose={togglePoissonInfo} />

      <ParamsGuidelinesPopup
        isOpen={showParamsGuidelines}
        onClose={toggleParamsGuidelines}
      />
    </div>
  );
}

export default App;
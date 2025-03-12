import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
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
import TypeHelpModal from "./components/modals/TypeHelpModal";
import PoissonInfoModal from "./components/modals/PoissonInfoModal";
import ParamsGuidelinesModal from "./components/modals/ParamsGuidelinesModal";

function App() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [vegetationType, setVegetationType] = useState<number>(1);
  const [params, setParams] = useState<VegetationParams>({
    vegetation_type: 1,
    density: 7.0,
    variation: 1.0,
    type_value: 10,
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProgressInfo>({
    current_row: 0,
    total_rows: 0,
    created_items: 0,
    errors: [],
  });
  const [result, setResult] = useState<string | null>(null);
  const [showTypeHelp, setShowTypeHelp] = useState<boolean>(false);
  const [showPoissonInfo, setShowPoissonInfo] = useState<boolean>(false);
  const [showParamsGuidelines, setShowParamsGuidelines] =
    useState<boolean>(false);

  useEffect(() => {
    loadDefaultParams(vegetationType);
  }, [vegetationType]);

  useEffect(() => {
    let intervalId: number | null = null;

    if (isProcessing) {
      intervalId = window.setInterval(async () => {
        try {
          const progressInfo = await invoke<ProgressInfo>(
            "get_vegetation_progress"
          );
          setProgress(progressInfo);

          if (
            progressInfo.current_row === progressInfo.total_rows &&
            progressInfo.total_rows > 0
          ) {
            setIsProcessing(false);
            clearInterval(intervalId!);
          }
        } catch (error) {
          console.error("Erreur lors de l'obtention de la progression:", error);
        }
      }, 500);
    } else if (intervalId) {
      clearInterval(intervalId);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isProcessing]);

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

  const executeProcessing = async () => {
    if (!selectedFile) {
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
    });

    try {
      const output = await invoke<string>("generate_vegetation_from_csv", {
        csvPath: selectedFile,
        params: {
          ...params,
          vegetation_type: vegetationType,
        },
      });

      setResult(output);
    } catch (error) {
      console.error("Erreur lors du traitement du fichier:", error);
      alert(`Erreur: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParamChange = (param: keyof VegetationParams, value: string) => {
    setParams({
      ...params,
      [param]: parseFloat(value),
    });
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
            vegetationType={vegetationType}
            isProcessing={isProcessing}
            toggleTypeHelp={toggleTypeHelp}
            toggleParamsGuidelines={toggleParamsGuidelines}
          />

          <FileOperations
            selectFile={selectFile}
            executeProcessing={executeProcessing}
            fileName={fileName}
            isProcessing={isProcessing}
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
            params={params}
            vegetationType={vegetationType}
          />
        </div>
      </div>

      {/* Modals */}
      <TypeHelpModal
        showTypeHelp={showTypeHelp}
        toggleTypeHelp={toggleTypeHelp}
      />

      <PoissonInfoModal
        showPoissonInfo={showPoissonInfo}
        togglePoissonInfo={togglePoissonInfo}
      />

      <ParamsGuidelinesModal
        showParamsGuidelines={showParamsGuidelines}
        toggleParamsGuidelines={toggleParamsGuidelines}
      />
    </div>
  );
}

export default App;

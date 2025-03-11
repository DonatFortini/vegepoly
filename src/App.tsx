import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { documentDir } from "@tauri-apps/api/path";
import "./App.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTree,
  faSeedling,
  faLayerGroup,
  faFileImport,
  faPlay,
  faUndo,
  faQuestionCircle,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";

// Type pour les paramètres de végétation
interface VegetationParams {
  vegetation_type: number;
  density: number;
  variation: number;
  type_value: number;
}

// Type pour les informations de progression
interface ProgressInfo {
  current_row: number;
  total_rows: number;
  created_items: number;
  errors: string[];
}

// Composant principal de l'application
function App() {
  // Variables d'état
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [vegetationType, setVegetationType] = useState<number>(1); // 1: Arbres, 2: Buissons, 3: Zone tampon
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
  const [activeTab, setActiveTab] = useState<string>("arbres");

  // Charger les paramètres par défaut lorsque le type de végétation change
  useEffect(() => {
    loadDefaultParams(vegetationType);
  }, [vegetationType]);

  // Fonction pour mettre à jour la progression pendant le traitement
  useEffect(() => {
    let intervalId: number | null = null;

    if (isProcessing) {
      intervalId = window.setInterval(async () => {
        try {
          const progressInfo = await invoke<ProgressInfo>(
            "get_vegetation_progress"
          );
          setProgress(progressInfo);

          // Vérifier si nous avons terminé
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

  // Fonction pour sélectionner un fichier
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

  // Charger les paramètres par défaut en fonction du type de végétation
  const loadDefaultParams = async (type: number) => {
    try {
      const defaults = await invoke<VegetationParams>(
        "get_default_vegetation_params",
        {
          vegetation_type: type,
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

  // Exécuter le traitement
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

  // Gérer les changements de paramètres
  const handleParamChange = (param: keyof VegetationParams, value: string) => {
    setParams({
      ...params,
      [param]: parseFloat(value),
    });
  };

  // Basculer les popups d'aide
  const toggleTypeHelp = () => setShowTypeHelp(!showTypeHelp);
  const togglePoissonInfo = () => setShowPoissonInfo(!showPoissonInfo);

  return (
    <div className="flex flex-col w-full h-screen min-w-[1200px] min-h-[800px] overflow-hidden">
      <div className="px-4 py-3">
        <h1 className="text-center text-2xl md:text-3xl font-bold">
          Outil de Conversion de Végétation
        </h1>
        <h5 className="text-center text-gray-600 mt-1 flex items-center justify-center">
          Utilisation de l'échantillonnage Poisson Disc pour une distribution
          naturelle
          <button
            className="ml-2 text-blue-500 hover:text-blue-700"
            onClick={togglePoissonInfo}
          >
            <FontAwesomeIcon icon={faInfoCircle} />
          </button>
        </h5>
      </div>

      <div className="flex flex-1 px-4 pb-4 overflow-hidden">
        {/* Panneau gauche */}
        <div className="w-1/2 pr-2 flex flex-col overflow-hidden">
          <div className="bg-white rounded-lg shadow mb-3 p-4 flex-shrink-0">
            <h2 className="text-xl font-semibold mb-2">Type d'Élément</h2>
            <div className="flex justify-around mb-2 gap-2">
              <button
                className={`px-4 py-2 rounded-md flex items-center ${
                  vegetationType === 1
                    ? "bg-blue-600 text-white"
                    : "bg-white text-blue-600 border border-blue-600"
                }`}
                onClick={() => setVegetationType(1)}
              >
                <FontAwesomeIcon icon={faTree} className="mr-2" />
                Arbres
              </button>
              <button
                className={`px-4 py-2 rounded-md flex items-center ${
                  vegetationType === 2
                    ? "bg-blue-600 text-white"
                    : "bg-white text-blue-600 border border-blue-600"
                }`}
                onClick={() => setVegetationType(2)}
              >
                <FontAwesomeIcon icon={faSeedling} className="mr-2" />
                Buissons
              </button>
              <button
                className={`px-4 py-2 rounded-md flex items-center ${
                  vegetationType === 3
                    ? "bg-blue-600 text-white"
                    : "bg-white text-blue-600 border border-blue-600"
                }`}
                onClick={() => setVegetationType(3)}
              >
                <FontAwesomeIcon icon={faLayerGroup} className="mr-2" />
                Zones Tampon
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow mb-3 p-4 flex-grow overflow-auto">
            <h2 className="text-xl font-semibold mb-2">
              Paramètres de Distribution
            </h2>
            <button
              className="mb-3 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center"
              onClick={() => loadDefaultParams(vegetationType)}
            >
              <FontAwesomeIcon icon={faUndo} className="mr-2" />
              Valeurs par Défaut
            </button>

            <div className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">
                  Densité (distance minimale)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={params.density}
                  onChange={(e) => handleParamChange("density", e.target.value)}
                  disabled={isProcessing}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Contrôle l'espacement entre les points de végétation (plus
                  élevé = moins dense)
                </p>
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  Variation (décalage aléatoire)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={params.variation}
                  onChange={(e) =>
                    handleParamChange("variation", e.target.value)
                  }
                  disabled={isProcessing}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Ajoute un caractère aléatoire naturel au placement des points
                </p>
              </div>

              <div>
                <label className="block mb-1  items-center font-medium">
                  Valeur de Type
                  <button
                    className="ml-2 text-blue-500 hover:text-blue-700"
                    onClick={toggleTypeHelp}
                  >
                    <FontAwesomeIcon icon={faQuestionCircle} />
                  </button>
                </label>
                <select
                  value={params.type_value}
                  onChange={(e) =>
                    handleParamChange("type_value", e.target.value)
                  }
                  disabled={isProcessing}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {vegetationType === 1 && (
                    <>
                      <option value="10">
                        10 - Pin (TerrainGen/Arbres/Pin/Pin.wrl)
                      </option>
                      <option value="11">
                        11 - Chêne vert
                        (TerrainGen/Arbres/CheneVert/CheneVert.wrl)
                      </option>
                      <option value="12">
                        12 - Peuplier (TerrainGen/Arbres/Peuplier/Peuplier.wrl)
                      </option>
                      <option value="13">13 - Sagece1</option>
                      <option value="14">14 - Sagece2</option>
                      <option value="15">15 - Sagece3</option>
                      <option value="20">
                        20 - Pin01 (TerrainGen/Arbres/Pin01/Pin01.wrl)
                      </option>
                      <option value="21">
                        21 - Pin02 (TerrainGen/Arbres/Pin02/Pin02.wrl)
                      </option>
                      <option value="22">
                        22 - Pin03 (TerrainGen/Arbres/Pin03/Pin03.wrl)
                      </option>
                      <option value="23">23 - Sagece4</option>
                      <option value="24">24 - Sagece5</option>
                      <option value="26">26 - Sagece6</option>
                      <option value="30">
                        30 - Cyprès (TerrainGen/Arbres/Cypres/Cypres.wrl)
                      </option>
                      <option value="31">
                        31 - Chêne (TerrainGen/Arbres/Chene01/Chene01.wrl)
                      </option>
                      <option value="32">
                        32 - Pin04 (TerrainGen/Arbres/Pin04/Pin04.wrl)
                      </option>
                      <option value="33">33 - Sagece7</option>
                      <option value="34">34 - Sagece8</option>
                      <option value="35">35 - Sagece9</option>
                    </>
                  )}
                  {vegetationType === 2 && (
                    <>
                      <option value="10">10 - Ciment - goudron</option>
                      <option value="11">11 - Chaumes</option>
                      <option value="12">12 - Champs verts</option>
                      <option value="13">13 - Jardins</option>
                      <option value="20">
                        20 - Guarigue1 (TerrainGen/Arbres/Pin01/Pin01.wrl)
                      </option>
                      <option value="21">
                        21 - Guarigue2 (TerrainGen/Arbres/Pin02/Pin02.wrl)
                      </option>
                      <option value="22">
                        22 - Guarigue3 (TerrainGen/Arbres/Pin03/Pin03.wrl)
                      </option>
                      <option value="23">23 - Type 4</option>
                    </>
                  )}
                  {vegetationType === 3 && (
                    <>
                      <option value="30">30 - Roccaille1</option>
                      <option value="31">31 - Roccaille2</option>
                      <option value="32">32 - Roccaille3</option>
                      <option value="33">33 - Type 4</option>
                    </>
                  )}
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  Sélectionnez le type de végétation spécifique pour
                  l'exportation
                </p>
              </div>
            </div>
          </div>

          {/* Sélection de fichier et exécution */}
          <div className="bg-white rounded-lg shadow p-4 flex-shrink-0">
            <h2 className="text-xl font-semibold mb-2">
              Opérations de Fichier
            </h2>
            <div className="flex items-center mb-3 flex-wrap gap-2">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                onClick={selectFile}
                disabled={isProcessing}
              >
                <FontAwesomeIcon icon={faFileImport} className="mr-2" />
                Sélectionner CSV
              </button>
              {fileName && (
                <div className="truncate max-w-full">
                  Sélectionné: {fileName}
                </div>
              )}
            </div>

            <button
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md w-full flex items-center justify-center"
              onClick={executeProcessing}
              disabled={isProcessing || !selectedFile}
            >
              <FontAwesomeIcon icon={faPlay} className="mr-2" />
              Exécuter
            </button>
          </div>
        </div>

        {/* Panneau droit */}
        <div className="w-1/2 pl-2 flex flex-col overflow-hidden">
          <div className="bg-white rounded-lg shadow p-4 mb-3 flex-grow overflow-auto">
            <h2 className="text-xl font-semibold mb-2">
              Progression et Résultats
            </h2>

            {isProcessing && (
              <div className="mb-4">
                <h5 className="text-lg font-medium">Traitement en cours...</h5>
                <div className="w-full bg-gray-200 rounded-full h-4 my-2">
                  <div
                    className="bg-blue-600 h-4 rounded-full"
                    style={{
                      width: `${
                        progress.total_rows
                          ? (progress.current_row / progress.total_rows) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <div className="mt-2 text-gray-600">
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
                  Généré {progress.created_items} points de végétation en
                  utilisant l'échantillonnage Poisson disc
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
          </div>

          <div className="bg-white rounded-lg shadow p-4 flex-shrink-0">
            <h2 className="text-xl font-semibold mb-2">
              Lignes Directrices des Paramètres
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Type de Végétation</th>
                    <th className="px-4 py-2 text-left">Densité Recommandée</th>
                    <th className="px-4 py-2 text-left">
                      Variation Recommandée
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2">Arbres</td>
                    <td className="px-4 py-2">7.0 - 15.0</td>
                    <td className="px-4 py-2">0.5 - 2.0</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Surfaces</td>
                    <td className="px-4 py-2">3.0 - 7.0</td>
                    <td className="px-4 py-2">0.3 - 1.0</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Roccailles</td>
                    <td className="px-4 py-2">2.0 - 5.0</td>
                    <td className="px-4 py-2">0.2 - 0.5</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Pour une végétation clairsemée, augmentez la densité. Pour une
              végétation dense, diminuez la densité. Une variation plus élevée
              crée des placements plus irréguliers.
            </p>
          </div>
        </div>
      </div>

      {/* Modal d'aide de type */}
      {showTypeHelp && (
        <div className="fixed inset-0 flex justify-center items-center z-50">
          <div className="absolute inset-0 bg-white bg-opacity-90"></div>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[80vh] overflow-auto m-4 border border-gray-300 z-10">
            <div className="flex justify-between items-center border-b p-4 bg-gray-50 sticky top-0">
              <h5 className="text-lg font-medium">
                Référence des Types de Végétation
              </h5>
              <button
                onClick={toggleTypeHelp}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <div className="flex border-b">
                <button
                  className={`px-4 py-2 ${
                    activeTab === "arbres" ? "border-b-2 border-blue-500" : ""
                  }`}
                  onClick={() => setActiveTab("arbres")}
                >
                  Arbres
                </button>
                <button
                  className={`px-4 py-2 ${
                    activeTab === "buissons" ? "border-b-2 border-blue-500" : ""
                  }`}
                  onClick={() => setActiveTab("buissons")}
                >
                  Surfaces
                </button>
                <button
                  className={`px-4 py-2 ${
                    activeTab === "tampon" ? "border-b-2 border-blue-500" : ""
                  }`}
                  onClick={() => setActiveTab("tampon")}
                >
                  Roccailles
                </button>
              </div>

              {activeTab === "arbres" && (
                <div className="p-4">
                  <h6 className="font-medium text-lg">Type 1: Arbres</h6>
                  <p className="my-2">
                    Les arbres seront distribués en utilisant l'échantillonnage
                    Poisson disc pour assurer un motif naturel de type forêt.
                    Les arbres maintiendront la distance minimale spécifiée les
                    uns des autres.
                  </p>
                  <p className="font-medium mt-3">Paramètres recommandés:</p>
                  <ul className="list-disc pl-5">
                    <li>
                      Densité: 7.0 - 15.0 (plus élevée pour les forêts plus
                      clairsemées)
                    </li>
                    <li>Variation: 0.5 - 2.0</li>
                  </ul>
                  <p className="mt-3">
                    <strong>Types d'arbres disponibles:</strong>
                  </p>
                  <ul className="list-disc pl-5 text-sm">
                    <li>Pin (10, 20-22, 32) - Différentes variétés de pins</li>
                    <li>Chêne (11, 31) - Chêne vert et chêne standard</li>
                    <li>Peuplier (12) - Arbre à croissance rapide</li>
                    <li>Cyprès (30) - Arbre conifère à feuillage persistant</li>
                    <li>
                      Sagece (13-15, 23-24, 26, 33-35) - Variétés d'arbres
                      ornementaux
                    </li>
                  </ul>
                </div>
              )}

              {activeTab === "buissons" && (
                <div className="p-4">
                  <h6 className="font-medium text-lg">Type 2: Surfaces</h6>
                  <p className="my-2">
                    Cette catégorie inclut diverses surfaces comme le ciment,
                    les chaumes, les champs verts et les guarigues. Ces surfaces
                    sont utilisées pour définir le type de sol sous-jacent dans
                    les zones où la végétation est placée.
                  </p>
                  <p className="font-medium mt-3">Paramètres recommandés:</p>
                  <ul className="list-disc pl-5">
                    <li>Densité: 3.0 - 7.0</li>
                    <li>Variation: 0.3 - 1.0</li>
                  </ul>
                  <p className="mt-3">
                    <strong>Types spécifiques:</strong>
                  </p>
                  <ul className="list-disc pl-5">
                    <li>Ciment/goudron (10) - Surfaces artificielles</li>
                    <li>Chaumes (11) - Herbes sèches</li>
                    <li>Champs verts (12) - Zones de culture</li>
                    <li>Jardins (13) - Espaces aménagés</li>
                    <li>
                      Guarigues (20-22) - Formation végétale méditerranéenne
                    </li>
                  </ul>
                </div>
              )}

              {activeTab === "tampon" && (
                <div className="p-4">
                  <h6 className="font-medium text-lg">
                    Type 3: Zones Rocailleuses
                  </h6>
                  <p className="my-2">
                    Cette catégorie comprend différents types de zones
                    rocailleuses qui peuvent être utilisées comme zones tampons
                    entre différents types de terrains ou végétation. Les
                    roccailles sont des arrangements de roches qui créent un
                    aspect naturel et peuvent servir de transition entre les
                    zones.
                  </p>
                  <p className="font-medium mt-3">Paramètres recommandés:</p>
                  <ul className="list-disc pl-5">
                    <li>Densité: 2.0 - 5.0</li>
                    <li>Variation: 0.2 - 0.5</li>
                  </ul>
                  <p className="mt-3">
                    <strong>Types spécifiques:</strong>
                  </p>
                  <ul className="list-disc pl-5">
                    <li>Roccaille1 (30) - Pour zones montagneuses</li>
                    <li>Roccaille2 (31) - Pour terrains vallonnés</li>
                    <li>Roccaille3 (32) - Pour zones côtières</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal d'info Poisson disc */}
      {showPoissonInfo && (
        <div className="fixed inset-0 flex justify-center items-center z-50">
          <div className="absolute inset-0 bg-white bg-opacity-90"></div>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[80vh] overflow-auto m-4 border border-gray-300 z-10">
            <div className="flex justify-between items-center border-b p-4 bg-gray-50 sticky top-0">
              <h5 className="text-lg font-medium">
                À propos de l'échantillonnage Poisson Disc
              </h5>
              <button
                onClick={togglePoissonInfo}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <p>
                Cet outil utilise{" "}
                <strong>l'échantillonnage Poisson disc</strong> pour distribuer
                la végétation naturellement. Contrairement au modèle basé sur
                une grille utilisé dans l'outil d'origine, l'échantillonnage
                Poisson disc crée des distributions d'apparence aléatoire qui
                maintiennent une distance minimale entre les points.
              </p>

              <div className="flex flex-col md:flex-row mt-4 mb-4">
                <div className="md:w-1/2">
                  <h6 className="text-center font-medium">
                    Basé sur grille (Original)
                  </h6>
                  <div className="flex justify-center">
                    <svg width="200" height="200" viewBox="0 0 200 200">
                      {/* Modèle de grille */}
                      {Array.from({ length: 8 }).map((_, i) =>
                        Array.from({ length: 8 }).map((_, j) => (
                          <circle
                            key={`grid-${i}-${j}`}
                            cx={25 + i * 25}
                            cy={25 + j * 25}
                            r="3"
                            fill="#3b82f6"
                          />
                        ))
                      )}
                    </svg>
                  </div>
                </div>
                <div className="md:w-1/2 mt-4 md:mt-0">
                  <h6 className="text-center font-medium">
                    Poisson Disc (Nouveau)
                  </h6>
                  <div className="flex justify-center">
                    <svg width="200" height="200" viewBox="0 0 200 200">
                      {/* Modèle Poisson disc (approximation) */}
                      <circle cx="30" cy="40" r="3" fill="#22c55e" />
                      <circle cx="70" cy="25" r="3" fill="#22c55e" />
                      <circle cx="100" cy="45" r="3" fill="#22c55e" />
                      <circle cx="140" cy="30" r="3" fill="#22c55e" />
                      <circle cx="170" cy="60" r="3" fill="#22c55e" />
                      <circle cx="40" cy="80" r="3" fill="#22c55e" />
                      <circle cx="85" cy="90" r="3" fill="#22c55e" />
                      <circle cx="120" cy="75" r="3" fill="#22c55e" />
                      <circle cx="160" cy="100" r="3" fill="#22c55e" />
                      <circle cx="30" cy="120" r="3" fill="#22c55e" />
                      <circle cx="70" cy="140" r="3" fill="#22c55e" />
                      <circle cx="115" cy="130" r="3" fill="#22c55e" />
                      <circle cx="150" cy="150" r="3" fill="#22c55e" />
                      <circle cx="60" cy="170" r="3" fill="#22c55e" />
                      <circle cx="100" cy="180" r="3" fill="#22c55e" />
                      <circle cx="140" cy="170" r="3" fill="#22c55e" />
                      <circle cx="180" cy="140" r="3" fill="#22c55e" />
                    </svg>
                  </div>
                </div>
              </div>

              <h6 className="font-medium mt-4">
                Avantages de l'échantillonnage Poisson Disc:
              </h6>
              <ul className="list-disc pl-5 my-2">
                <li>
                  Aspect plus naturel de la végétation sans artefacts de grille
                </li>
                <li>
                  Meilleure distribution spatiale avec une densité contrôlée
                </li>
                <li>
                  Les points sont aléatoires mais maintiennent un espacement
                  minimal entre eux
                </li>
                <li>
                  Parfait pour les forêts, les prairies et les paysages naturels
                </li>
                <li>
                  Crée une distribution de "bruit bleu" idéale pour les éléments
                  naturels
                </li>
              </ul>

              <h6 className="font-medium mt-4">Comment ça fonctionne:</h6>
              <ol className="list-decimal pl-5 my-2">
                <li>Commencer par un point aléatoire dans le polygone</li>
                <li>
                  Générer de nouveaux points autour des points existants à une
                  distance minimale (contrôlée par le paramètre de densité)
                </li>
                <li>
                  Conserver les points qui sont suffisamment éloignés de tous
                  les points existants
                </li>
                <li>
                  Continuer jusqu'à ce qu'aucun nouveau point ne puisse être
                  ajouté
                </li>
                <li>
                  Appliquer le paramètre de variation pour ajouter de petits
                  décalages aléatoires à chaque point
                </li>
              </ol>

              <h6 className="font-medium mt-4">Explication des paramètres:</h6>
              <ul className="list-disc pl-5 my-2">
                <li>
                  <strong>Densité</strong> - Contrôle la distance minimale entre
                  les points. Des valeurs plus élevées créent une végétation
                  plus clairsemée.
                </li>
                <li>
                  <strong>Variation</strong> - Ajoute des décalages aléatoires à
                  chaque emplacement de point, créant une irrégularité plus
                  naturelle.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

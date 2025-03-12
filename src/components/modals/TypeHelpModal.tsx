import { useState } from "react";

interface TypeHelpModalProps {
  showTypeHelp: boolean;
  toggleTypeHelp: () => void;
}

const TypeHelpModal = ({
  showTypeHelp,
  toggleTypeHelp,
}: TypeHelpModalProps) => {
  const [activeTab, setActiveTab] = useState<string>("arbres");

  if (!showTypeHelp) return null;

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50">
      <div className="absolute inset-0 bg-white bg-opacity-90"></div>
      <div
        className="rounded-lg shadow-lg w-full max-w-3xl max-h-[80vh] overflow-auto m-4 border border-gray-300 z-10"
        id="card"
      >
        <div
          className="flex justify-between items-center border-b p-4 sticky top-0"
          id="interactive"
        >
          <h5 className="text-lg font-medium">
            Référence des Types de Végétation
          </h5>
          <button
            onClick={toggleTypeHelp}
            className="hover:text-gray-700 transition-colors duration-200 p-1 rounded-full hover:bg-gray-200"
            id="medium-visibility"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <div className="flex border-b">
            <button
              className={`px-4 py-2 ${
                activeTab === "arbres" ? "border-b-2 border-blue-500" : ""
              } hover:bg-gray-100 transition-colors duration-200`}
              onClick={() => setActiveTab("arbres")}
            >
              Arbres
            </button>
            <button
              className={`px-4 py-2 ${
                activeTab === "buissons" ? "border-b-2 border-blue-500" : ""
              } hover:bg-gray-100 transition-colors duration-200`}
              onClick={() => setActiveTab("buissons")}
            >
              Surfaces
            </button>
            <button
              className={`px-4 py-2 ${
                activeTab === "tampon" ? "border-b-2 border-blue-500" : ""
              } hover:bg-gray-100 transition-colors duration-200`}
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
                Poisson disc pour assurer un motif naturel de type forêt. Les
                arbres maintiendront la distance minimale spécifiée les uns des
                autres.
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
                Cette catégorie inclut diverses surfaces comme le ciment, les
                chaumes, les champs verts et les guarigues. Ces surfaces sont
                utilisées pour définir le type de sol sous-jacent dans les zones
                où la végétation est placée.
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
                <li>Guarigues (20-22) - Formation végétale méditerranéenne</li>
              </ul>
            </div>
          )}

          {activeTab === "tampon" && (
            <div className="p-4">
              <h6 className="font-medium text-lg">
                Type 3: Zones Rocailleuses
              </h6>
              <p className="my-2">
                Cette catégorie comprend différents types de zones rocailleuses
                qui peuvent être utilisées comme zones tampons entre différents
                types de terrains ou végétation. Les roccailles sont des
                arrangements de roches qui créent un aspect naturel et peuvent
                servir de transition entre les zones.
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
  );
};

export default TypeHelpModal;

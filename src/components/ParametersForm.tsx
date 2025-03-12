import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUndo,
  faQuestionCircle,
  faBook,
} from "@fortawesome/free-solid-svg-icons";
import { VegetationParams } from "../types";
import Card from "./shared/Card";
import Button from "./shared/Button";

interface ParametersFormProps {
  params: VegetationParams;
  handleParamChange: (param: keyof VegetationParams, value: string) => void;
  loadDefaultParams: (type: number) => void;
  vegetationType: number;
  isProcessing: boolean;
  toggleTypeHelp: () => void;
  toggleParamsGuidelines: () => void;
}

const ParametersForm = ({
  params,
  handleParamChange,
  loadDefaultParams,
  vegetationType,
  isProcessing,
  toggleTypeHelp,
  toggleParamsGuidelines,
}: ParametersFormProps) => {
  return (
    <Card variant="secondary" className="mb-3 flex-grow">
      <div className="flex justify-between items-center mb-3">
        <Button
          onClick={() => loadDefaultParams(vegetationType)}
          icon={faUndo}
          variant="primary"
        >
          Valeurs par Défaut
        </Button>

        <button
          className="px-3 py-1 rounded-md flex items-center border border-gray-300"
          onClick={toggleParamsGuidelines}
          id="interactive"
        >
          <FontAwesomeIcon icon={faBook} className="mr-2" />
          Guide des paramètres
        </button>
      </div>

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
          <p className="text-sm mt-1" id="medium-visibility">
            Contrôle l'espacement entre les points de végétation (plus élevé =
            moins dense)
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
            onChange={(e) => handleParamChange("variation", e.target.value)}
            disabled={isProcessing}
            className="w-full px-3 py-2 border rounded-md"
          />
          <p className="text-sm mt-1" id="medium-visibility">
            Ajoute un caractère aléatoire naturel au placement des points
          </p>
        </div>

        <div>
          <label className="block mb-1 items-center font-medium">
            Valeur de Type
            <button
              className="ml-2"
              onClick={toggleTypeHelp}
              id="medium-visibility"
            >
              <FontAwesomeIcon icon={faQuestionCircle} />
            </button>
          </label>
          <select
            value={params.type_value}
            onChange={(e) => handleParamChange("type_value", e.target.value)}
            disabled={isProcessing}
            className="w-full px-3 py-2 border rounded-md"
          >
            {vegetationType === 1 && (
              <>
                <option value="10">
                  10 - Pin (TerrainGen/Arbres/Pin/Pin.wrl)
                </option>
                <option value="11">
                  11 - Chêne vert (TerrainGen/Arbres/CheneVert/CheneVert.wrl)
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
          <p className="text-sm mt-1" id="medium-visibility">
            Sélectionnez le type de végétation spécifique pour l'exportation
          </p>
        </div>
      </div>
    </Card>
  );
};

export default ParametersForm;

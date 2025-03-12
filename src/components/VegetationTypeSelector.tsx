import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTree,
  faSeedling,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import Card from "./shared/Card";

interface VegetationTypeSelectorProps {
  vegetationType: number;
  setVegetationType: (type: number) => void;
}

const VegetationTypeSelector = ({
  vegetationType,
  setVegetationType,
}: VegetationTypeSelectorProps) => {
  return (
    <Card title="Type d'Élément" className="mb-3 flex-shrink-0">
      <div className="flex justify-around mb-2 gap-2">
        <button
          className={`px-4 py-2 rounded-md flex items-center ${
            vegetationType === 1 ? "text-white" : "text-blue-600 border"
          } transition-all duration-200 hover:shadow-md`}
          onClick={() => setVegetationType(1)}
          id={vegetationType === 1 ? "accent-primary" : "interactive"}
        >
          <FontAwesomeIcon icon={faTree} className="mr-2" />
          Arbres
        </button>
        <button
          className={`px-4 py-2 rounded-md flex items-center ${
            vegetationType === 2 ? "text-white" : "text-blue-600 border"
          } transition-all duration-200 hover:shadow-md`}
          onClick={() => setVegetationType(2)}
          id={vegetationType === 2 ? "accent-primary" : "interactive"}
        >
          <FontAwesomeIcon icon={faSeedling} className="mr-2" />
          Buissons
        </button>
        <button
          className={`px-4 py-2 rounded-md flex items-center ${
            vegetationType === 3 ? "text-white" : "text-blue-600 border"
          } transition-all duration-200 hover:shadow-md`}
          onClick={() => setVegetationType(3)}
          id={vegetationType === 3 ? "accent-primary" : "interactive"}
        >
          <FontAwesomeIcon icon={faLayerGroup} className="mr-2" />
          Zones Tampon
        </button>
      </div>
    </Card>
  );
};

export default VegetationTypeSelector;

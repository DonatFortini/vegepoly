import Popup from "../shared/Popup";

interface ParamsGuidelinesPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const ParamsGuidelinesPopup = ({
  isOpen,
  onClose,
}: ParamsGuidelinesPopupProps) => {
  return (
    <Popup
      isOpen={isOpen}
      onClose={onClose}
      title="Guide des Paramètres"
      maxWidth="550px"
      maxHeight="400px"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left border-b">Type</th>
              <th className="px-3 py-2 text-left border-b">Densité</th>
              <th className="px-3 py-2 text-left border-b">Variation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-2 border-b">Arbres</td>
              <td className="px-3 py-2 border-b">10.0 - 30.0</td>
              <td className="px-3 py-2 border-b">0.5 - 2.0</td>
            </tr>
            <tr>
              <td className="px-3 py-2 border-b">Surfaces</td>
              <td className="px-3 py-2 border-b">3.0 - 7.0</td>
              <td className="px-3 py-2 border-b">0.3 - 1.0</td>
            </tr>
            <tr>
              <td className="px-3 py-2">Roccailles</td>
              <td className="px-3 py-2">2.0 - 5.0</td>
              <td className="px-3 py-2">0.2 - 0.5</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div>
          <h6 className="font-semibold">Densité</h6>
          <p>
            Distance minimale entre points. Valeur plus élevée = végétation plus
            clairsemée.
          </p>
        </div>

        <div>
          <h6 className="font-semibold">Variation</h6>
          <p>
            Décalage aléatoire ajouté aux points. Augmente le caractère naturel
            de la distribution.
          </p>
        </div>

        <div>
          <h6 className="font-semibold">Type</h6>
          <p>
            Définit le modèle 3D ou la texture utilisée pour chaque élément
            généré.
          </p>
        </div>
      </div>
    </Popup>
  );
};

export default ParamsGuidelinesPopup;

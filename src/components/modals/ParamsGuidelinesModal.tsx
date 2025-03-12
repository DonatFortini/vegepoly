interface ParamsGuidelinesModalProps {
  showParamsGuidelines: boolean;
  toggleParamsGuidelines: () => void;
}

const ParamsGuidelinesModal = ({
  showParamsGuidelines,
  toggleParamsGuidelines,
}: ParamsGuidelinesModalProps) => {
  if (!showParamsGuidelines) return null;

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
            Lignes Directrices des Paramètres
          </h5>
          <button
            onClick={toggleParamsGuidelines}
            className="p-1 rounded-full"
            id="medium-visibility"
          >
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Type de Végétation</th>
                  <th className="px-4 py-2 text-left">Densité Recommandée</th>
                  <th className="px-4 py-2 text-left">Variation Recommandée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2">Arbres</td>
                  <td className="px-4 py-2">10.0 - 30.0</td>
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

          <div className="mt-4">
            <h6 className="font-medium text-lg">Explication des paramètres:</h6>
            <ul className="list-disc pl-5 mt-2">
              <li className="mb-2">
                <strong>Densité (distance minimale)</strong> - Contrôle
                l'espacement entre les points de végétation. Une valeur plus
                élevée crée une végétation plus clairsemée, tandis qu'une valeur
                plus basse crée une végétation plus dense.
              </li>
              <li className="mb-2">
                <strong>Variation (décalage aléatoire)</strong> - Ajoute de
                petits décalages aléatoires à chaque point pour créer un effet
                plus naturel. Une valeur plus élevée augmente l'irrégularité de
                la distribution.
              </li>
              <li className="mb-2">
                <strong>Valeur de Type</strong> - Définit le modèle 3D ou la
                texture spécifique utilisée pour chaque élément généré.
              </li>
            </ul>
          </div>

          <p className="mt-4 text-sm" id="medium-visibility">
            Pour une végétation clairsemée, augmentez la densité. Pour une
            végétation dense, diminuez la densité. Une variation plus élevée
            crée des placements plus irréguliers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ParamsGuidelinesModal;

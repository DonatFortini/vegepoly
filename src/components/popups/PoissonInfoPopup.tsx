import Popup from "../shared/Popup";

interface PoissonInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const PoissonInfoPopup = ({ isOpen, onClose }: PoissonInfoPopupProps) => {
  return (
    <Popup
      isOpen={isOpen}
      onClose={onClose}
      title="Échantillonnage Poisson Disc"
      maxWidth="700px"
      maxHeight="500px"
    >
      <p>
        L'échantillonnage <strong>Poisson disc</strong> génère des distributions
        de points naturelles en maintenant une distance minimale entre chaque
        point, contrairement aux grilles régulières.
      </p>

      <div className="flex flex-col md:flex-row mt-4 mb-4">
        <div className="md:w-1/2">
          <h6 className="text-center font-medium">Grille standard</h6>
          <div className="flex justify-center">
            <svg width="200" height="200" viewBox="0 0 200 200">
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
          <h6 className="text-center font-medium">Poisson Disc</h6>
          <div className="flex justify-center">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="30" cy="40" r="3" fill="#3b82f6" />
              <circle cx="70" cy="25" r="3" fill="#3b82f6" />
              <circle cx="100" cy="45" r="3" fill="#3b82f6" />
              <circle cx="140" cy="30" r="3" fill="#3b82f6" />
              <circle cx="170" cy="60" r="3" fill="#3b82f6" />
              <circle cx="40" cy="80" r="3" fill="#3b82f6" />
              <circle cx="85" cy="90" r="3" fill="#3b82f6" />
              <circle cx="120" cy="75" r="3" fill="#3b82f6" />
              <circle cx="160" cy="100" r="3" fill="#3b82f6" />
              <circle cx="30" cy="120" r="3" fill="#3b82f6" />
              <circle cx="70" cy="140" r="3" fill="#3b82f6" />
              <circle cx="115" cy="130" r="3" fill="#3b82f6" />
              <circle cx="150" cy="150" r="3" fill="#3b82f6" />
              <circle cx="60" cy="170" r="3" fill="#3b82f6" />
              <circle cx="100" cy="180" r="3" fill="#3b82f6" />
              <circle cx="140" cy="170" r="3" fill="#3b82f6" />
              <circle cx="180" cy="140" r="3" fill="#3b82f6" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-1/2">
          <h6 className="font-medium">Principe de l'algorithme:</h6>
          <ol className="list-decimal pl-5 my-2 text-sm">
            <li>Placement d'un point initial aléatoire</li>
            <li>Génération de nouveaux points autour des points existants</li>
            <li>
              Conservation uniquement des points respectant la distance minimale
            </li>
            <li>Ajout d'un léger décalage pour plus de naturel (variation)</li>
          </ol>
        </div>

        <div className="md:w-1/2">
          <h6 className="font-medium">Avantages:</h6>
          <ul className="list-disc pl-5 my-2 text-sm">
            <li>Distribution naturelle sans motif artificiel</li>
            <li>Densité contrôlée et adaptable</li>
            <li>
              Idéal pour la végétation, les textures et les effets naturels
            </li>
          </ul>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600">
        Les paramètres <strong>Densité</strong> (distance minimale entre points)
        et <strong>Variation</strong> (décalage aléatoire) contrôlent
        l'apparence finale de la distribution.
      </p>
    </Popup>
  );
};

export default PoissonInfoPopup;

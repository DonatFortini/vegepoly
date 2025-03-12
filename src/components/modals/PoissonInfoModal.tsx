interface PoissonInfoModalProps {
  showPoissonInfo: boolean;
  togglePoissonInfo: () => void;
}

const PoissonInfoModal = ({
  showPoissonInfo,
  togglePoissonInfo,
}: PoissonInfoModalProps) => {
  if (!showPoissonInfo) return null;

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
            À propos de l'échantillonnage Poisson Disc
          </h5>
          <button
            onClick={togglePoissonInfo}
            className="hover:text-gray-700 transition-colors duration-200 p-1 rounded-full hover:bg-gray-200"
            id="medium-visibility"
          >
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          <p>
            Cet outil utilise <strong>l'échantillonnage Poisson disc</strong>{" "}
            pour distribuer la végétation naturellement. Contrairement au modèle
            basé sur une grille qui décale les points aléatoirement,
            l'échantillonnage Poisson disc crée des distributions d'apparence
            aléatoire qui maintiennent une distance minimale entre les points.
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

          <h6 className="font-medium mt-4">
            Avantages de l'échantillonnage Poisson Disc:
          </h6>
          <ul className="list-disc pl-5 my-2">
            <li>
              Aspect plus naturel de la végétation sans artefacts de grille
            </li>
            <li>Meilleure distribution spatiale avec une densité contrôlée</li>
            <li>
              Les points sont aléatoires mais maintiennent un espacement minimal
              entre eux
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
              Conserver les points qui sont suffisamment éloignés de tous les
              points existants
            </li>
            <li>
              Continuer jusqu'à ce qu'aucun nouveau point ne puisse être ajouté
            </li>
            <li>
              Appliquer le paramètre de variation pour ajouter de petits
              décalages aléatoires à chaque point
            </li>
          </ol>

          <h6 className="font-medium mt-4">Explication des paramètres:</h6>
          <ul className="list-disc pl-5 my-2">
            <li>
              <strong>Densité</strong> - Contrôle la distance minimale entre les
              points. Des valeurs plus élevées créent une végétation plus
              clairsemée.
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
  );
};

export default PoissonInfoModal;

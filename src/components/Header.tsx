import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

interface HeaderProps {
  togglePoissonInfo: () => void;
}

const Header = ({ togglePoissonInfo }: HeaderProps) => {
  return (
    <div className="px-4 py-3">
      <h1 className="text-center text-2xl md:text-3xl font-bold">
        Outil de Conversion de Végétation
      </h1>
      <h5
        className="text-center mt-1 flex items-center justify-center"
        id="medium-visibility"
      >
        Utilisation de l'échantillonnage Poisson Disc pour une distribution
        naturelle
        <button
          className="ml-2"
          onClick={togglePoissonInfo}
          id="medium-visibility"
        >
          <FontAwesomeIcon icon={faInfoCircle} />
        </button>
      </h5>
    </div>
  );
};

export default Header;

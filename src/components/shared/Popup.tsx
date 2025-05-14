import { ReactNode, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
  maxHeight?: string;
}

const Popup = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "500px",
  maxHeight = "400px",
}: PopupProps) => {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.7)" }}
      ></div>
      <div
        ref={popupRef}
        style={{ maxWidth, maxHeight }}
        className="bg-white rounded-lg shadow-lg w-full overflow-hidden z-10 m-4 border"
        id="card"
      >
        <div
          className="flex justify-between items-center border-b p-3 sticky top-0"
          id="interactive"
        >
          <h3 className="font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div
          className="p-4 overflow-y-auto"
          style={{ maxHeight: `calc(${maxHeight} - 52px)` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Popup;

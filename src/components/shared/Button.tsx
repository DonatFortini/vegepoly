import { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";

interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  icon?: IconDefinition;
  disabled?: boolean;
  fullWidth?: boolean;
  variant?: "primary" | "default";
  className?: string;
}

const Button = ({
  children,
  onClick,
  icon,
  disabled = false,
  fullWidth = false,
  variant = "default",
  className = "",
}: ButtonProps) => {
  const isPrimary = variant === "primary";

  return (
    <button
      className={`
        px-4 py-2 rounded-md flex items-center
        ${isPrimary ? "text-white" : "text-blue-600 border"}
        ${fullWidth ? "w-full justify-center" : ""}
        ${
          disabled
            ? "opacity-60 cursor-not-allowed"
            : "hover:opacity-90 hover:shadow-md transition-all duration-200"
        }
        ${className}
      `}
      onClick={onClick}
      disabled={disabled}
      id={isPrimary ? "accent-primary" : "interactive"}
    >
      {icon && <FontAwesomeIcon icon={icon} className="mr-2" />}
      {children}
    </button>
  );
};

export default Button;

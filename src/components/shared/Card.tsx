import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  variant?: "primary" | "secondary";
}

const Card = ({
  children,
  title,
  className = "",
  variant = "primary",
}: CardProps) => {
  const cardId = variant === "primary" ? "card" : "interactive";

  return (
    <div className={`rounded-lg shadow p-4 ${className}`} id={cardId}>
      {title && <h2 className="text-xl font-semibold mb-2">{title}</h2>}
      {children}
    </div>
  );
};

export default Card;

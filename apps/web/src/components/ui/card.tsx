/** Tarjeta base: superficie blanca, radio y sombra de los tokens. */
export function Card({
  flotante = false,
  className = "",
  children,
}: {
  /** true = panel sobre el mapa o un menu (sombra mas marcada). */
  flotante?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-tarjeta border border-borde bg-superficie ${
        flotante ? "shadow-flotante" : "shadow-tarjeta"
      } ${className}`}
    >
      {children}
    </div>
  );
}

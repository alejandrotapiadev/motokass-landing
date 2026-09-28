import { ICONS, WHATSAPP_PATH } from "./icons";

interface Props {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
  filled?: boolean;
}

export default function Icon({ name, size = 22, className, strokeWidth = 1.7, filled = false }: Props) {
  if (name === "whatsapp") {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={WHATSAPP_PATH} />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? "" }}
    />
  );
}

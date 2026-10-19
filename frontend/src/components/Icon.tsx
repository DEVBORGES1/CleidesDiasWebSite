import type { CSSProperties } from 'react';

interface IconProps {
  name: string;
  size?: number;
  weight?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

/** Ícone Material Symbols (decorativo: sempre oculto para leitores de tela). */
export function Icon({ name, size = 20, weight, color, className, style }: IconProps) {
  return (
    <span aria-hidden="true" className={`ms${className ? ` ${className}` : ''}`} style={{ fontSize: size, fontWeight: weight, color, ...style }}>
      {name}
    </span>
  );
}

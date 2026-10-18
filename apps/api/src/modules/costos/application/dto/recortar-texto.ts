export const recortarTexto = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

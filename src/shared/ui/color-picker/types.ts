export interface CustomColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  /** Если true — отображается встроенным блоком, если false — как кнопка со всплывающим окном */
  inline?: boolean;
}

export interface ColorPickerOptionInfo {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
}

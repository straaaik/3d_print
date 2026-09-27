import React from 'react';

export type InventoryIconProps = React.SVGProps<SVGSVGElement> & {
  title?: string;
  filamentColor?: string;
  accentColor?: string;
};

// ============================================================================
// ВАРИАНТ 14: COLORPICKER PURE SPOOL (Изометрическая 3D-катушка)
// ============================================================================
export function FilamentSpoolIcon({ title = 'Катушка филамента', filamentColor, ...props }: InventoryIconProps) {
  const titleId = React.useId();
  const color = props.style?.color || filamentColor || 'currentColor';

  const colorTransitionStyle = React.useMemo(() => ({
    transition: 'fill 0.35s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  }), []);

  return (
    <svg
      viewBox="36 24 168 124"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={titleId}
      {...props}
    >
      <title id={titleId}>{title}</title>
      {/* Тень */}
      <ellipse cx="120" cy="140" rx="78" ry="18" fill="rgba(0,0,0,0.5)" />
      {/* Нижний фланец */}
      <ellipse cx="120" cy="116" rx="78" ry="23" fill="#18181b" stroke="#3f3f46" strokeWidth="2.5" />
      <ellipse cx="120" cy="116" rx="74" ry="21" fill="#09090b" stroke="#27272a" strokeWidth="1" />
      {/* Тело нити */}
      <path
        d="M 52,68 L 52,106 A 68 20 0 0 0 188,106 L 188,68 A 68 20 0 0 1 52,68 Z"
        fill={color}
        stroke="#09090b"
        strokeWidth="1.5"
        style={colorTransitionStyle}
      />
      {/* Витки */}
      <path d="M 53,76 A 67 19 0 0 0 187,76" stroke="rgba(0,0,0,0.28)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 53,84 A 67 19 0 0 0 187,84" stroke="rgba(0,0,0,0.32)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 53,92 A 67 19 0 0 0 187,92" stroke="rgba(0,0,0,0.28)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 53,100 A 67 19 0 0 0 187,100" stroke="rgba(0,0,0,0.32)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Блик */}
      <path d="M 80,70 L 80,112" stroke="rgba(255,255,255,0.35)" strokeWidth="8" strokeLinecap="round" />
      {/* Верхняя намотка */}
      <ellipse cx="120" cy="68" rx="68" ry="20" fill={color} stroke="rgba(0,0,0,0.4)" strokeWidth="1" style={colorTransitionStyle} />
      {/* Верхний фланец */}
      <ellipse cx="120" cy="50" rx="78" ry="23" fill="rgba(39, 39, 42, 0.45)" stroke="#52525b" strokeWidth="2.5" />
      {/* Окошки */}
      <ellipse cx="80" cy="48" rx="14" ry="5" fill="rgba(0,0,0,0.4)" stroke="#3f3f46" strokeWidth="1" />
      <ellipse cx="160" cy="48" rx="14" ry="5" fill="rgba(0,0,0,0.4)" stroke="#3f3f46" strokeWidth="1" />
      <ellipse cx="120" cy="63" rx="16" ry="5" fill="rgba(0,0,0,0.4)" stroke="#3f3f46" strokeWidth="1" />
      <ellipse cx="120" cy="36" rx="16" ry="5" fill="rgba(0,0,0,0.4)" stroke="#3f3f46" strokeWidth="1" />
      {/* Ступица */}
      <ellipse cx="120" cy="50" rx="27" ry="8.5" fill="#09090b" stroke="#71717a" strokeWidth="2" />
      <ellipse cx="120" cy="50" rx="15" ry="4.5" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
      {/* Элегантный сход нити вправо */}
      <path d="M 188,75 C 198,82 204,95 200,108 C 196,118 190,124 184,126" stroke={color} strokeWidth="4" strokeLinecap="round" style={colorTransitionStyle} />
      <circle cx="184" cy="126" r="3" fill={color} style={colorTransitionStyle} />
    </svg>
  );
}

// ============================================================================
// ВАРИАНТ 01: BAMBU LAB X1C CORE-XY PRO (Реалистичный закрытый 3D-куб)
// ============================================================================
export function PrinterMachineIcon({ title = '3D-принтер', accentColor, ...props }: InventoryIconProps) {
  const titleId = React.useId();
  const color = props.style?.color || accentColor || 'currentColor';

  return (
    <svg
      viewBox="20 16 200 168"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={titleId}
      {...props}
    >
      <title id={titleId}>{title}</title>
      {/* Мягкая тень под принтером */}
      <ellipse cx="120" cy="172" rx="76" ry="12" fill="rgba(0,0,0,0.5)" />

      {/* Задняя и боковые внутренние стенки камеры */}
      <path d="M50 48 L120 28 L190 48 L190 148 L120 168 L50 148 Z" fill="#0d0d10" stroke="#27272a" strokeWidth="2" />
      <path d="M120 28 L120 168" stroke="#18181b" strokeWidth="2" />

      {/* Внутренняя подсветка камеры (сверху) */}
      <ellipse cx="120" cy="38" rx="46" ry="7" fill="rgba(255,255,255,0.08)" />
      <ellipse cx="120" cy="38" rx="46" ry="7" fill={color} fillOpacity="0.22" style={{ transition: 'fill 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />

      {/* Направляющие карбоновые балки CoreXY (оси X/Y) */}
      <line x1="68" y1="58" x2="172" y2="58" stroke="#3f3f46" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="68" y1="63" x2="172" y2="63" stroke="#27272a" strokeWidth="2.5" strokeLinecap="round" />

      {/* Подвижная печатающая голова CoreXY с обдувом */}
      <rect x="105" y="50" width="30" height="22" rx="4" fill="#18181b" stroke="#52525b" strokeWidth="2" />
      <rect x="111" y="54" width="18" height="7" rx="2" fill="#09090b" />
      {/* Светодиодный индикатор состояния головы */}
      <circle cx="114" cy="57" r="1.5" fill={color} style={{ transition: 'fill 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      {/* Латунное сопло */}
      <polygon points="117,72 123,72 122,78 118,78" fill="#d97706" stroke="#78350f" strokeWidth="1" />
      {/* Светящаяся точка экструзии */}
      <circle cx="120" cy="80" r="4" fill={color} fillOpacity="0.25" style={{ transition: 'fill 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      <circle cx="120" cy="80" r="2.5" fill={color} style={{ transition: 'fill 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />

      {/* Подогреваемый стол с золотистым текстурным листом PEI */}
      <polygon points="68,124 120,108 172,124 120,140" fill="#1c1917" stroke="#ca8a04" strokeWidth="2" />
      <polygon points="72,124 120,110 168,124 120,138" fill="rgba(202,138,4,0.18)" />

      {/* 3D-модель (кубик/деталь), растущая на столе в цвете филамента */}
      <path d="M110 114 L120 108 L130 114 L130 126 L120 132 L110 126 Z" fill={color} stroke="#09090b" strokeWidth="1.5" style={{ transition: 'fill 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      <path d="M120 108 L120 132" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
      <path d="M110 114 L120 120 L130 114" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />

      {/* Внешний монолитный алюминиевый корпус с фасками */}
      <path d="M44 42 L120 22 L196 42 L196 152 L120 172 L44 152 Z" stroke="#3f3f46" strokeWidth="3" />
      <path d="M44 42 L120 22 L196 42 L196 48 L120 28 L44 48 Z" fill="#27272a" />
      <line x1="44" y1="42" x2="120" y2="22" stroke={color} strokeWidth="1" strokeOpacity="0.3" style={{ transition: 'stroke 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />

      {/* Тонированная стеклянная передняя дверца */}
      <polygon points="52,50 120,32 188,50 188,148 120,166 52,148" fill={color} fillOpacity="0.06" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" style={{ transition: 'fill 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      {/* Световой диагональный блик на стекле */}
      <path d="M68 65 L132 46 L148 51 L84 70 Z" fill="rgba(255,255,255,0.12)" />
      {/* Металлическая ручка двери */}
      <line x1="178" y1="92" x2="178" y2="122" stroke="#e4e4e7" strokeWidth="3.5" strokeLinecap="round" />

      {/* Верхний сенсорный дисплей управления */}
      <rect x="134" y="24" width="34" height="13" rx="2" fill="#09090b" stroke="#71717a" strokeWidth="1.5" />
      <rect x="138" y="27" width="26" height="7" rx="1" fill={color} fillOpacity="0.85" style={{ transition: 'fill 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />
    </svg>
  );
}


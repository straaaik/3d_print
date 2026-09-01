import React from 'react';

type InventoryIconProps = React.SVGProps<SVGSVGElement> & {
  title?: string;
};

export function FilamentSpoolIcon({ title = 'Катушка филамента', ...props }: InventoryIconProps) {
  const titleId = React.useId();

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={titleId}
      {...props}
    >
      <title id={titleId}>{title}</title>
      <path d="M15 13.5C15 10.5 22.6 8 32 8s17 2.5 17 5.5v37C49 53.5 41.4 56 32 56s-17-2.5-17-5.5v-37Z" fill="currentColor" fillOpacity=".12" />
      <path d="M15 13.5C15 16.5 22.6 19 32 19s17-2.5 17-5.5M15 50.5C15 47.5 22.6 45 32 45s17 2.5 17 5.5" stroke="currentColor" strokeWidth="3" />
      <path d="M15 13.5C15 10.5 22.6 8 32 8s17 2.5 17 5.5v37C49 53.5 41.4 56 32 56s-17-2.5-17-5.5v-37Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M19 22.5h26M19 27.5h26M19 32.5h26M19 37.5h26M19 42.5h26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".72" />
      <path d="M32 8c4 0 7.25 1.15 7.25 2.55S36 13.1 32 13.1s-7.25-1.15-7.25-2.55S28 8 32 8Z" fill="currentColor" fillOpacity=".28" stroke="currentColor" strokeWidth="2" />
      <path d="M49 31c5.5 0 8 2.7 8 7.25V42c0 2.25 1 3.5 3 3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="m58.5 42.5 2 3-2 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PrinterMachineIcon({ title = '3D-принтер', ...props }: InventoryIconProps) {
  const titleId = React.useId();

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={titleId}
      {...props}
    >
      <title id={titleId}>{title}</title>
      <rect x="9" y="7" width="46" height="50" rx="4" fill="currentColor" fillOpacity=".08" stroke="currentColor" strokeWidth="3" />
      <path d="M15 49h34M17 14h30M21 14v25M43 14v25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M21 21h22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <rect x="27" y="18" width="10" height="8" rx="2" fill="currentColor" fillOpacity=".25" stroke="currentColor" strokeWidth="2" />
      <path d="m30 26 2 5 2-5" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m23 42 9-5 9 5-9 5-9-5Z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M23 42v7l9 5 9-5v-7M32 47v7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <rect x="13" y="53" width="38" height="4" rx="2" fill="currentColor" fillOpacity=".3" />
      <path d="M47 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

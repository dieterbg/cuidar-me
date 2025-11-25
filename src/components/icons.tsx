import { cn } from "@/lib/utils"

export const CuidarMeIcon = ({ className }: { className?: string }) => (
    <svg 
        width="32" 
        height="32" 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-8 w-8", className)}
    >
        <path d="M16 3.5C16 3.5 8 5.5 8 12.5V19.5L16 23.5L24 19.5V12.5C24 5.5 16 3.5 16 3.5Z" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11 15.5L15 19.5L21 12.5" stroke="hsl(var(--accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


export const CuidarMeLogo = ({ className }: { className?: string }) => {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src="/logo.svg" 
      alt="Cuidar.me" 
      width={140}
      height={60}
      className={className}
      style={{
        maxWidth: '100%',
        height: 'auto'
      }}
    />
  );
};


export const Trophy = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-6 w-6", className)}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );

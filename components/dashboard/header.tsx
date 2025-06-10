interface DashboardHeaderProps {
  heading: string;
  text?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({
  heading,
  text,
  children,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2 text-primary font-martian">
      <div className="grid gap-1">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          {heading}
        </h1>
        {text && (
          <p className="text-lg text-norfolk-green">
            {text}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
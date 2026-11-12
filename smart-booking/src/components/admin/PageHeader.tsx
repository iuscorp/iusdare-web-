import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy-deep sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-navy-deep/70">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

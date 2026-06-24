export interface CurrentFocusCardProps {
  profile: {
    currentFocus: {
      description: string;
      activePersonas: string[];
    };
  };
  personas: {
    id: string;
    name: string;
    status: string;
  }[];
}

export function CurrentFocusCard({ profile, personas = [] }: CurrentFocusCardProps) {
  const { currentFocus } = profile;

  if (!currentFocus) return null;

  const activePersonas = personas.filter((p) =>
    currentFocus.activePersonas?.includes(p.id)
  );
  const inactivePersonas = personas.filter(
    (p) => !currentFocus.activePersonas?.includes(p.id) && p.status !== "paused"
  );
  const pausedPersonas = personas.filter((p) => p.status === "paused");

  return (
    <section
      aria-label="Current focus"
      role="region"
      tabIndex={-1}
      className="card p-8 rounded mb-8"
      style={{
        backgroundColor: "var(--card-bg)",
        border: `1px solid var(--card-border)`,
        boxShadow: "none",
      }}
    >
      <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--accent)" }}>
        Current Focus
      </h2>
      <p className="mb-4 text-gray-700 dark:text-gray-300 italic" style={{ whiteSpace: "pre-line", fontStyle: "italic" }}>
        {currentFocus.description}
      </p>
      <div className="flex flex-wrap gap-3">
        {activePersonas.map((p) => (
          <span
            key={p.id}
            className="rounded-full px-3 py-1 text-sm font-semibold"
            style={{ backgroundColor: "var(--accent)", color: "white" }}
          >
            {p.name}
          </span>
        ))}
        {inactivePersonas.map((p) => (
          <span
            key={p.id}
            className="rounded-full px-3 py-1 text-sm font-medium text-gray-400 dark:text-gray-600"
          >
            {p.name}
          </span>
        ))}
        {pausedPersonas.map((p) => (
          <span
            key={p.id}
            className="rounded-full px-3 py-1 text-sm font-medium italic text-gray-500 dark:text-gray-700"
          >
            {p.name} (Paused)
          </span>
        ))}
      </div>
    </section>
  );
}


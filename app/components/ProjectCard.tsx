interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  tags?: string[];
  current_focus?: string | null;
  github_link?: string | null;
  demo_link?: string | null;
  notes_link?: string | null;
}

interface ProjectCardProps {
  project: Project;
  selected?: boolean;
  onClick?: (id: string) => void;
}

export function ProjectCard({ project, selected, onClick }: ProjectCardProps) {
  const handleCardClick = () => {
    if (onClick) {
      onClick(project.id);
    }
  };

  return (
    <section 
      onClick={handleCardClick}
      className="card p-4 m-2 rounded border transition-all cursor-pointer text-left focus:outline-none"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: selected ? "var(--accent)" : "var(--card-border)",
        boxShadow: selected ? "0 0 8px var(--accent)" : "var(--card-shadow)"
      }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-lg" style={{color: "var(--foreground)"}}>
          {project.title}
        </h3>
        {selected && (
          <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-bold select-none">
            [ACTIVE]
          </span>
        )}
      </div>
      <p className="mb-2" style={{color: "var(--foreground)"}}>{project.description}</p>
      <div className="flex flex-wrap items-center gap-2">        
        {project.tags && project.tags.map((tag, idx) => (
          <span key={idx} style={{
            backgroundColor: "var(--accent)",
            color: "white",
            fontWeight: "600",
            fontSize: "0.75rem",
            lineHeight: "1rem",
            borderRadius: "9999px",
            padding: "0.125rem 0.5rem",
            textTransform: "uppercase",
            userSelect: "none"
          }}>
            {tag}
          </span>
        ))}
        {project.current_focus && <small style={{color: "var(--foreground)", fontStyle: "italic"}}>{project.current_focus}</small>}
      </div>
      <div className="mt-2 flex gap-4" onClick={(e) => e.stopPropagation()}>
        {project.github_link && (
          <a href={project.github_link} style={{color: "var(--accent)"}} className="hover:underline" target="_blank" rel="noreferrer">
            GitHub
          </a>
        )}
        {project.demo_link && (
          <a href={project.demo_link} style={{color: "var(--accent)"}} className="hover:underline" target="_blank" rel="noreferrer">
            Demo
          </a>
        )}
        {project.notes_link && (
          <a href={project.notes_link} style={{color: "var(--accent)"}} className="hover:underline" target="_blank" rel="noreferrer">
            Notes
          </a>
        )}
      </div>
    </section>
  );
}

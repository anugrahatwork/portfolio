interface LearningLogModel {
  id: string;
  content: string;
  inspiredByPersona: string[];
  linkedProjects: string[];
  created_at: string;
}

interface Persona {
  id: string;
  name: string;
}

interface Project {
  id: string;
  title: string;
}

interface LearningLogProps {
  learningLogs: LearningLogModel[];
  personas: Persona[];
  projects: Project[];
}

export function LearningLog({ learningLogs, personas, projects }: LearningLogProps) {
  const getPersonaName = (id: string) => {
    const p = personas.find((x) => x.id === id);
    return p ? p.name : id;
  };
  const getProjectTitle = (id: string) => {
    const p = projects.find((x) => x.id === id);
    return p ? p.title : id;
  };

  return (
    <section aria-label="Learning log" role="region" tabIndex={-1} className="mb-10">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Learning Log</h2>
      <ul>
        {learningLogs.map((log) => (
          <li key={log.id} className="mb-8 rounded bg-white dark:bg-gray-900 p-6 shadow border border-gray-300 dark:border-gray-700">
            <time className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
              {new Date(log.created_at).toLocaleDateString()}
            </time>
            <p className="mb-2 text-gray-700 dark:text-gray-300 max-w-prose whitespace-pre-wrap">
              {log.content}
            </p>
            <div className="mb-3 text-gray-700 dark:text-gray-300">
              <strong>Reflections inspired by personas:</strong>{' '}
              {log.inspiredByPersona.map((id) => (
                <a
                  key={id}
                  href="#"
                  className="mr-2 cursor-pointer underline text-blue-600"
                  aria-label={`Link to persona ${getPersonaName(id)}`}
                >
                  {getPersonaName(id)}
                </a>
              ))}
            </div>
            <div className="mb-3 text-gray-700 dark:text-gray-300">
              <strong>Linked projects:</strong>{' '}
              {log.linkedProjects.map((id) => (
                <a
                  key={id}
                  href="#"
                  className="mr-2 cursor-pointer underline text-blue-600"
                  aria-label={`Link to project ${getProjectTitle(id)}`}
                >
                  {getProjectTitle(id)}
                </a>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}


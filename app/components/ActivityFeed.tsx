import { useState, useEffect } from "react";
import { DbActivity } from "@/lib/types";

interface ActivityFeedProps {
  activities: DbActivity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative pl-6 border-l-2 border-zinc-200 dark:border-zinc-800/80 flex flex-col gap-6 my-4 ml-3">
      {activities.map((activity) => {
        // Derive tags to display - use default "Logs" if empty or undefined
        const tagsToRender = activity.tags && activity.tags.length > 0 ? activity.tags : ["Logs"];

        // Format dates on the client to avoid hydration mismatch
        const dateStr = mounted
          ? new Date(activity.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        return (
          <div key={activity.id} className="relative group animate-fade-in">
            {/* Vertical timeline dot colored by event type */}
            <div
              className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-zinc-50 dark:border-black flex items-center justify-center transition-all duration-300 group-hover:scale-125 ${
                activity.event_type === "milestone"
                  ? "bg-amber-500 shadow-md shadow-amber-500/50"
                  : activity.event_type === "learning_reflection"
                  ? "bg-violet-500 shadow-md shadow-violet-500/50"
                  : activity.event_type === "system_alert"
                  ? "bg-red-500 shadow-md shadow-red-500/50"
                  : activity.event_type === "agent_log"
                  ? "bg-emerald-500 shadow-md shadow-emerald-500/50"
                  : "bg-accent shadow-md shadow-accent/50"
              }`}
              title={`Event Type: ${activity.event_type || "default"}`}
            />

            {/* Premium Activity Card */}
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/80 hover:border-accent/40 dark:hover:border-accent/40 transition-all duration-300 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <time className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono font-semibold uppercase tracking-wider">
                  {dateStr}
                </time>

                <div className="flex flex-wrap gap-1.5 items-center">
                  {tagsToRender.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold ${
                        tag.toLowerCase() === "logs"
                          ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          : "bg-accent/10 text-accent dark:bg-accent/10 dark:text-blue-400 border border-accent/20 dark:border-blue-500/20"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed font-medium whitespace-pre-wrap">
                {activity.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}


"use client";

import { ChevronDown, ChevronRight, CircleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { stringify } from "yaml";
import SearchBox, { type Filters, type ParsedQuery } from "@/components/search";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import type { auditLog } from "@/lib/db/schema";

type AuditLog = typeof auditLog.$inferSelect;

export default function AuditLogViewer({
  logs: initialLogs = [],
  users = [],
}: {
  logs?: AuditLog[];
  users?: { name: string; email: string }[];
}) {
  const [logs, updateLogs] = useState(initialLogs);
  const containerRef = useRef<HTMLDivElement>(null);
  const entryRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    const es = new EventSource("/api/ev/log");
    es.onmessage = (res) =>
      updateLogs((x) => [...x.slice(-999), JSON.parse(res.data)]);
    return () => es.close();
  }, []);

  const filters: Filters = {
    user: () => users.map((u) => u.email),
    has: () => ["artifact", "tierlist", "rubgram", "file"],
  };

  const [query, setQuery] = useState<ParsedQuery>();

  const filteredLogs = useMemo(() => {
    return logs.filter((log) =>
      query
        ? (query.filters.user
            ? log.author?.toString() ===
              users.find((u) => u.email === query.filters.user)?.name
            : true) &&
          (query.filters.has
            ? log.text.toLowerCase().includes(query.filters.has)
            : true) &&
          stringify(log).toLowerCase().includes(query.search.toLowerCase())
        : true,
    );
  }, [query, logs, users]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const focusedIds = useMemo(() => Array.from(expandedIds), [expandedIds]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: need to update
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // exactly one focused → scroll to that entry
    if (focusedIds.length === 1) {
      const el = entryRefs.current.get(focusedIds[0]);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      return;
    }

    // more than one focused → do nothing
    if (focusedIds.length > 1) {
      return;
    }

    // none focused → always follow bottom
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [logs, focusedIds, query]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Bangkok",
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      timeZone: "Asia/Bangkok",
    });
  };

  const shouldGroup = (
    currentLog: AuditLog,
    previousLog: AuditLog | undefined,
  ): boolean => {
    if (!previousLog) return false;
    if (currentLog.author !== previousLog.author) return false;
    const timeDiff = Math.abs(
      new Date(currentLog.time).getTime() -
        new Date(previousLog.time).getTime(),
    );
    return timeDiff < 5 * 60 * 1000; // Group if within 5 minutes
  };

  return (
    <div className="bg-[#2225] h-svh w-full flex flex-col items-center gap-2 p-2 overflow-hidden">
      <SearchBox
        filters={filters}
        className="bg-input"
        onQueryChange={setQuery}
      />
      <div className="w-full grow-0 overflow-auto" ref={containerRef}>
        {filteredLogs.map((log, idx) => {
          const isGrouped = shouldGroup(log, logs[idx - 1]);
          const isExpanded = expandedIds.has(log.id);

          return (
            <div
              key={log.id}
              ref={(el) => {
                if (el) entryRefs.current.set(log.id, el);
                else entryRefs.current.delete(log.id);
              }}
              className="group hover:bg-[#2225] transition-colors"
            >
              <div
                className={`flex gap-4 px-4 ${isGrouped ? "py-0.5" : "py-3.5"} pb-0.5`}
              >
                <div className="w-min shrink-0 text-right pt-0.5">
                  <span
                    className={`text-xs whitespace-nowrap invisible ${isGrouped ? "group-hover:visible" : ""}`}
                  >
                    {formatTime(log.time)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  {!isGrouped && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-semibold text-white">
                        {log.author || "System"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(log.time)} {formatTime(log.time)}
                      </span>
                    </div>
                  )}

                  <div
                    className="flex items-start justify-between gap-2"
                    onClick={() => toggleExpand(log.id)}
                    role="tree"
                  >
                    <span className="text-gray-300 leading-relaxed flex items-center gap-2">
                      {log.text}{" "}
                      {!isExpanded && log.details ? (
                        <SimpleTooltip text="Click to see details">
                          <CircleAlert className="opacity-80 size-4" />
                        </SimpleTooltip>
                      ) : (
                        ""
                      )}
                    </span>
                    {log.details ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-6 w-6 text-gray-400 hover:text-gray-200 hover:bg-[#404249]"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    ) : undefined}
                  </div>

                  {isExpanded && log.details ? (
                    <div className="mt-2 mb-1">
                      <pre className="bg-[#1e1f2255] rounded p-3 text-sm text-gray-300 overflow-x-auto border border-[#27282c] font-mono">
                        {stringify(log.details)}
                      </pre>
                    </div>
                  ) : undefined}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useAtomValue } from "@effect/atom-react";
import type { BackgroundTask, BackgroundTaskOutput, ScopedThreadRef } from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import { Eye, TerminalSquare } from "lucide-react";
import { useState } from "react";
import { backgroundTaskEnvironment } from "~/state/backgroundTasks";
import { useAtomCommand } from "~/state/use-atom-command";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

function TaskDetails({ task, threadRef }: { task: BackgroundTask; threadRef: ScopedThreadRef }) {
  const readOutput = useAtomCommand(backgroundTaskEnvironment.output);
  const stop = useAtomCommand(backgroundTaskEnvironment.stop);
  const [output, setOutput] = useState<BackgroundTaskOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [loading, setLoading] = useState(false);
  const input = { threadId: threadRef.threadId, taskId: task.taskId, sessionKey: task.sessionKey };
  const refresh = async () => {
    setLoading(true);
    const result = await readOutput({ environmentId: threadRef.environmentId, input });
    if (result._tag === "Success") {
      setOutput(result.value);
      setError(null);
    } else setError(String(Cause.squash(result.cause)));
    setLoading(false);
  };

  const stopTask = async () => {
    setStopping(true);
    setError(null);
    const result = await stop({ environmentId: threadRef.environmentId, input });
    if (result._tag === "Failure") {
      setError(String(Cause.squash(result.cause)));
      setStopping(false);
    }
    // A successful request is not completion. Native membership removes the row.
  };
  return (
    <div className="space-y-3 border-t border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {task.provider} ·{" "}
          {task.kind === "monitor"
            ? "Monitor"
            : task.kind === "command"
              ? "Background command"
              : "Background task"}
        </span>
        <Button
          size="xs"
          variant="outline"
          disabled={!task.canStop || stopping}
          onClick={() => void stopTask()}
        >
          {stopping ? "Stopping…" : "Stop task"}
        </Button>
      </div>
      {task.description && task.description !== task.command ? (
        <p className="text-sm font-medium [overflow-wrap:anywhere]">{task.description}</p>
      ) : null}
      {task.command ? (
        <pre className="whitespace-pre-wrap break-words font-mono text-xs">{task.command}</pre>
      ) : null}
      {task.startedAt ? (
        <p className="text-xs text-muted-foreground">
          Started {new Date(task.startedAt).toLocaleTimeString()}
        </p>
      ) : null}
      {!task.canStop ? (
        <p className="text-xs text-muted-foreground">
          This provider cannot stop this task individually.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Output</span>
        <Button size="xs" variant="ghost" disabled={loading} onClick={() => void refresh()}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>
      {output?.available ? (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-2 font-mono text-xs">
          {output.truncated ? "Earlier output omitted.\n" : ""}
          {output.text || "No output yet."}
        </pre>
      ) : (
        <p className="text-xs text-muted-foreground">
          {output
            ? "The provider has not exposed output for this task."
            : "Choose Refresh to read the available output."}
        </p>
      )}
    </div>
  );
}

export default function BackgroundTasksPanel({ threadRef }: { threadRef: ScopedThreadRef }) {
  const result = useAtomValue(
    backgroundTaskEnvironment.tasks({
      environmentId: threadRef.environmentId,
      input: { threadId: threadRef.threadId },
    }),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const snapshot = result._tag === "Success" ? result.value : null;
  const tasks = snapshot?.tasks ?? [];
  const active = tasks.find((task) => task.taskId === selected) ?? tasks[0];
  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <h2 className="text-sm font-medium">Background Tasks</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Commands and monitors running in this thread.
        </p>
      </div>
      {result._tag === "Failure" ? (
        <p role="alert" className="p-3 text-xs text-destructive">
          Could not load tasks: {String(Cause.squash(result.cause))}
        </p>
      ) : !snapshot ? (
        <p className="p-3 text-xs text-muted-foreground">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <p className="p-3 text-xs text-muted-foreground">
          {snapshot.supported
            ? "No background tasks are running."
            : "This provider does not report native background tasks."}
        </p>
      ) : (
        <>
          <div className="space-y-1 p-2">
            {tasks.map((task) => (
              <div key={`${task.sessionKey}:${task.taskId}`}>
                <button
                  type="button"
                  aria-pressed={active?.taskId === task.taskId}
                  className="flex w-full min-w-0 items-center rounded-md px-2 py-2 text-left text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-accent"
                  onClick={() => setSelected(task.taskId)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {task.kind === "monitor" ? (
                      <Eye className="size-3 shrink-0" />
                    ) : (
                      <TerminalSquare className="size-3 shrink-0" />
                    )}
                    <span className="min-w-0 truncate">
                      {task.description || "Background task"}
                    </span>
                  </span>
                </button>
              </div>
            ))}
          </div>
          {active ? (
            <TaskDetails
              key={`${threadRef.environmentId}:${threadRef.threadId}:${active.sessionKey}:${active.taskId}`}
              task={active}
              threadRef={threadRef}
            />
          ) : null}
        </>
      )}
    </ScrollArea>
  );
}

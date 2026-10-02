import { WS_METHODS } from "@t3tools/contracts";
import { Atom } from "effect/unstable/reactivity";
import type { EnvironmentRegistry } from "../connection/registry.ts";
import {
  createAtomCommandScheduler,
  createEnvironmentRpcCommand,
  createEnvironmentRpcSubscriptionAtomFamily,
} from "./runtime.ts";

type BackgroundSummary =
  | { readonly count: number; readonly oldestStartedAt: string | null }
  | undefined;

export function backgroundTaskIndicatorVisible(
  summary: BackgroundSummary,
  foregroundRunning: boolean,
  now: number,
) {
  if (!summary || summary.count === 0) return false;
  if (!foregroundRunning) return true;
  return summary.oldestStartedAt !== null && now - Date.parse(summary.oldestStartedAt) >= 60_000;
}

export function backgroundTaskIndicatorDelay(
  summary: BackgroundSummary,
  foregroundRunning: boolean,
  now: number,
) {
  if (!summary || summary.count === 0 || !foregroundRunning || summary.oldestStartedAt === null)
    return null;
  const delay = Date.parse(summary.oldestStartedAt) + 60_000 - now;
  return Number.isFinite(delay) ? Math.max(0, delay) : null;
}

export function createBackgroundTaskEnvironmentAtoms<R, E>(
  runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>,
) {
  const scheduler = createAtomCommandScheduler();
  return {
    tasks: createEnvironmentRpcSubscriptionAtomFamily(runtime, {
      label: "environment-data:background-tasks",
      tag: WS_METHODS.backgroundTasksSubscribe,
      idleTtlMs: 0,
    }),
    output: createEnvironmentRpcCommand(runtime, {
      label: "background-task:output",
      tag: WS_METHODS.backgroundTasksOutput,
    }),
    stop: createEnvironmentRpcCommand(runtime, {
      label: "background-task:stop",
      tag: WS_METHODS.backgroundTasksStop,
      scheduler,
      concurrency: {
        mode: "singleFlight",
        key: ({ environmentId, input }) =>
          JSON.stringify([environmentId, input.threadId, input.sessionKey, input.taskId]),
      },
    }),
  };
}

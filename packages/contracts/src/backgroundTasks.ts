import * as Schema from "effect/Schema";
import { IsoDateTime, ThreadId, TrimmedNonEmptyString } from "./baseSchemas.ts";

/** Native execution handles are opaque and scoped to one provider session. */
export const BackgroundTask = Schema.Struct({
  taskId: TrimmedNonEmptyString,
  sessionKey: TrimmedNonEmptyString,
  provider: TrimmedNonEmptyString,
  kind: Schema.Literals(["command", "monitor", "unknown"]),
  description: Schema.String,
  command: Schema.optional(Schema.String),
  toolUseId: Schema.optional(Schema.String),
  agentId: Schema.optional(Schema.String),
  startedAt: Schema.optional(IsoDateTime),
  canStop: Schema.Boolean,
});
export type BackgroundTask = typeof BackgroundTask.Type;

export const BackgroundTasksInput = Schema.Struct({ threadId: ThreadId });
export type BackgroundTasksInput = typeof BackgroundTasksInput.Type;
export const BackgroundTaskInput = Schema.Struct({
  threadId: ThreadId,
  taskId: TrimmedNonEmptyString,
  sessionKey: TrimmedNonEmptyString,
});
export type BackgroundTaskInput = typeof BackgroundTaskInput.Type;
export const BackgroundTasksSnapshot = Schema.Struct({
  supported: Schema.Boolean,
  tasks: Schema.Array(BackgroundTask),
});
export type BackgroundTasksSnapshot = typeof BackgroundTasksSnapshot.Type;
export const BackgroundTaskOutput = Schema.Struct({
  available: Schema.Boolean,
  text: Schema.String,
  truncated: Schema.Boolean,
});
export type BackgroundTaskOutput = typeof BackgroundTaskOutput.Type;

export class BackgroundTaskError extends Schema.TaggedError<BackgroundTaskError>()(
  "BackgroundTaskError",
  { detail: Schema.String },
) {
  override get message() {
    return this.detail;
  }
}

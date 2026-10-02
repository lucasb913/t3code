import {
  BackgroundTaskError,
  BackgroundTaskInput,
  BackgroundTaskOutput,
  BackgroundTasksSnapshot,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { Tool, Toolkit } from "effect/unstable/ai";
import { McpInvocationContext } from "../McpInvocationContext.ts";
import { ProviderService } from "../../provider/Services/ProviderService.ts";

const taskInput = Schema.Struct({
  taskId: BackgroundTaskInput.fields.taskId,
  sessionKey: BackgroundTaskInput.fields.sessionKey,
});
export const BackgroundTasksToolkit = Toolkit.make(
  Tool.make("list_background_tasks", {
    description:
      "List native background commands and monitors belonging to this thread. Does not discover host processes.",
    parameters: Schema.Record(Schema.String, Schema.Never),
    success: BackgroundTasksSnapshot,
    failure: BackgroundTaskError,
    dependencies: [McpInvocationContext, ProviderService],
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Destructive, false),
  Tool.make("read_background_task_output", {
    description: "Read available bounded output from one native background task in this thread.",
    parameters: taskInput,
    success: BackgroundTaskOutput,
    failure: BackgroundTaskError,
    dependencies: [McpInvocationContext, ProviderService],
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Destructive, false),
  Tool.make("stop_background_task", {
    description:
      "Stop one native background task in this thread, using its current sessionKey from list_background_tasks.",
    parameters: taskInput,
    success: Schema.Struct({ requested: Schema.Boolean }),
    failure: BackgroundTaskError,
    dependencies: [McpInvocationContext, ProviderService],
  }).annotate(Tool.Destructive, true),
);

export const BackgroundTasksToolkitHandlersLive = BackgroundTasksToolkit.toLayer(
  Effect.succeed({
    list_background_tasks: () =>
      Effect.gen(function* () {
        const scope = yield* McpInvocationContext;
        const provider = yield* ProviderService;
        return yield* provider.listBackgroundTasks({ threadId: scope.threadId });
      }),
    read_background_task_output: (input: typeof taskInput.Type) =>
      Effect.gen(function* () {
        const scope = yield* McpInvocationContext;
        const provider = yield* ProviderService;
        return yield* provider.readBackgroundTaskOutput({ ...input, threadId: scope.threadId });
      }),
    stop_background_task: (input: typeof taskInput.Type) =>
      Effect.gen(function* () {
        const scope = yield* McpInvocationContext;
        const provider = yield* ProviderService;
        yield* provider.stopBackgroundTask({ ...input, threadId: scope.threadId });
        return { requested: true };
      }),
  }),
);

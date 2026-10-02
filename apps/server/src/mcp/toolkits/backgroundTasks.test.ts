import { expect, it } from "@effect/vitest";
import { Tool } from "effect/unstable/ai";
import { BackgroundTasksToolkit } from "./backgroundTasks.ts";

it("exports MCP object schemas that provider tool registration accepts", () => {
  for (const tool of Object.values(BackgroundTasksToolkit.tools)) {
    // The MCP server rejects a missing top-level type before it starts listening.
    expect(Tool.getJsonSchema(tool).type).toBe("object");
  }
});

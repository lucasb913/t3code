import * as NodeServices from "@effect/platform-node/NodeServices";
import { it as effectIt } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import { describe, expect, it } from "vite-plus/test";
import {
  BACKGROUND_OUTPUT_LIMIT,
  claudeBackgroundOutputFile,
  makeNativeCommandIndex,
  readNativeOutputTail,
} from "./NativeBackgroundTasks.ts";

describe("native command output", () => {
  it("keeps a bounded UTF-8 tail and isolates command identities", () => {
    const index = makeNativeCommandIndex();
    index.start("a", "dev server", "2026-10-02T10:00:00Z");
    index.start("b", "watch build", "2026-10-02T10:00:00Z");
    index.append("a", "é".repeat(BACKGROUND_OUTPUT_LIMIT));
    index.append("a", "\nready");
    index.append("b", "other task");
    expect(index.output("a").truncated).toBe(true);
    expect(index.output("a").text.endsWith("\nready")).toBe(true);
    expect(new TextEncoder().encode(index.output("a").text).length).toBeLessThanOrEqual(
      BACKGROUND_OUTPUT_LIMIT,
    );
    expect(index.output("b")).toEqual({ available: true, text: "other task", truncated: false });
    expect(index.output("missing").available).toBe(false);
  });

  it("reads the file named by the native background placeholder only for its confirmed task", () => {
    const text =
      "Command running in background with ID: native-a. Output is being written to: /tmp/a path/native-a.output. You will be notified when it completes. To check interim output, use Read on that file path.";
    expect(claudeBackgroundOutputFile(text, "native-a")).toBe("/tmp/a path/native-a.output");
    expect(claudeBackgroundOutputFile(text, "native-b")).toBeUndefined();
    expect(
      claudeBackgroundOutputFile("stdout mentions /tmp/random.log", "native-a"),
    ).toBeUndefined();
  });
});

effectIt.effect("reads a bounded file tail and handles file truncation and removal", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const directory = yield* fs.makeTempDirectoryScoped();
    const path = `${directory}/task.output`;
    yield* fs.writeFileString(path, "é".repeat(BACKGROUND_OUTPUT_LIMIT) + "\nready");
    const tail = yield* readNativeOutputTail(fs, path);
    expect(tail.available).toBe(true);
    expect(tail.truncated).toBe(true);
    expect(tail.text.endsWith("\nready")).toBe(true);
    expect(new TextEncoder().encode(tail.text).length).toBeLessThanOrEqual(BACKGROUND_OUTPUT_LIMIT);
    yield* fs.writeFileString(path, "rotated");
    expect(yield* readNativeOutputTail(fs, path)).toEqual({
      available: true,
      text: "rotated",
      truncated: false,
    });
    yield* fs.writeFileString(path, "");
    expect((yield* readNativeOutputTail(fs, path)).text).toBe("");
    yield* fs.remove(path);
    expect((yield* readNativeOutputTail(fs, path).pipe(Effect.result))._tag).toBe("Failure");
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);

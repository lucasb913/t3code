import type { BackgroundTaskOutput } from "@t3tools/contracts";
import * as ByteSize from "effect/ByteSize";
import * as Effect from "effect/Effect";
import type * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";

export const BACKGROUND_OUTPUT_LIMIT = 64 * 1024;
const COMMAND_LIMIT = 64;

function decodeTail(bytes: Uint8Array) {
  let start = 0;
  while (start < bytes.length && (bytes[start]! & 0xc0) === 0x80) start++;
  return new TextDecoder().decode(bytes.subarray(start));
}

function boundedOutput(text: string) {
  const bytes = new TextEncoder().encode(text);
  return {
    text: decodeTail(bytes.subarray(Math.max(0, bytes.length - BACKGROUND_OUTPUT_LIMIT))),
    truncated: bytes.length > BACKGROUND_OUTPUT_LIMIT,
  };
}

/** Retain only bounded native output; completion does not prove a terminal exited. */
export function makeNativeCommandIndex() {
  const commands = new Map<
    string,
    {
      startedAt: string;
      command: string;
      output: string;
      truncated: boolean;
    }
  >();
  return {
    start(itemId: string, command: string, startedAt: string) {
      if (commands.has(itemId)) return;
      commands.set(itemId, { command, startedAt, output: "", truncated: false });
      if (commands.size > COMMAND_LIMIT) commands.delete(commands.keys().next().value!);
    },
    append(itemId: string, delta: string) {
      const command = commands.get(itemId);
      if (!command) return;
      const tail = boundedOutput(command.output + delta);
      command.truncated ||= tail.truncated;
      command.output = tail.text;
    },
    replace(itemId: string, text: string) {
      const command = commands.get(itemId);
      if (!command) return;
      const tail = boundedOutput(text);
      command.output = tail.text;
      command.truncated = tail.truncated;
    },
    get(itemId: string) {
      return commands.get(itemId);
    },
    output(itemId: string): BackgroundTaskOutput {
      const command = commands.get(itemId);
      return {
        available: command !== undefined,
        text: command?.output ?? "",
        truncated: command?.truncated ?? false,
      };
    },
  };
}

/** Bash's structured result confirms the task; its native placeholder names the file. */
export function claudeBackgroundOutputFile(text: string, taskId: string): string | undefined {
  const prefix = `Command running in background with ID: ${taskId}. Output is being written to: `;
  const suffix = ". You will be notified when it completes.";
  if (!text.startsWith(prefix)) return undefined;
  const end = text.indexOf(suffix, prefix.length);
  if (end < 0) return undefined;
  const path = text.slice(prefix.length, end);
  return path.startsWith("/") && !path.includes("\n") ? path : undefined;
}

/** The path comes only from a native tool result, never from a client request. */
export function readNativeOutputTail(fileSystem: FileSystem.FileSystem, path: string) {
  return Effect.scoped(
    Effect.gen(function* () {
      const file = yield* fileSystem.open(path, { flag: "r" });
      const stat = yield* file.stat;
      if (stat.type !== "File") return { available: false, text: "", truncated: false };
      const size = ByteSize.toBigInt(stat.size);
      const limit = BigInt(BACKGROUND_OUTPUT_LIMIT);
      const offset = size > limit ? size - limit : 0n;
      yield* file.seek(offset, "start");
      const bytes = yield* file.readAlloc(Number(size > limit ? limit : size));
      return {
        available: true,
        text: Option.match(bytes, {
          onNone: () => "",
          onSome: decodeTail,
        }),
        truncated: offset > 0n,
      };
    }),
  );
}

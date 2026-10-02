import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  BackgroundTask,
  BackgroundTaskOutput,
  EnvironmentId,
  ThreadId,
} from "@t3tools/contracts";
import { AppText as Text } from "../../components/AppText";
import { backgroundTaskEnvironment } from "../../state/backgroundTasks";
import { useEnvironmentQuery } from "../../state/query";
import { useAtomCommand } from "../../state/use-atom-command";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";

function BackgroundTaskDetail({
  task,
  environmentId,
  threadId,
}: {
  task: BackgroundTask;
  environmentId: EnvironmentId;
  threadId: ThreadId;
}) {
  const stop = useAtomCommand(backgroundTaskEnvironment.stop);
  const read = useAtomCommand(backgroundTaskEnvironment.output);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<BackgroundTaskOutput | null>(null);
  const input = { threadId, taskId: task.taskId, sessionKey: task.sessionKey };
  const refresh = async () => {
    const result = await read({ environmentId, input });
    if (result._tag === "Success") {
      setOutput(result.value);
      setError(null);
    } else setError(String(squashAtomCommandFailure(result)));
  };
  const stopTask = async () => {
    setStopping(true);
    setError(null);
    const result = await stop({ environmentId, input });
    if (result._tag === "Failure") {
      setError(String(squashAtomCommandFailure(result)));
      setStopping(false);
    }
  };
  return (
    <View className="gap-3 rounded-xl bg-card p-4">
      <Text className="font-semibold text-foreground">{task.description || "Background task"}</Text>
      <Text className="text-sm text-muted-foreground">
        {task.provider} · {task.kind}
      </Text>
      {task.command ? (
        <Text selectable className="font-mono text-sm text-foreground">
          {task.command}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" className="text-sm text-destructive">
          {error}
        </Text>
      ) : null}
      <View className="flex-row gap-6">
        <Pressable accessibilityRole="button" onPress={() => void refresh()}>
          <Text className="text-primary">{output ? "Refresh output" : "View output"}</Text>
        </Pressable>
        {task.canStop ? (
          <Pressable accessibilityRole="button" disabled={stopping} onPress={() => void stopTask()}>
            <Text className="text-destructive">{stopping ? "Stopping…" : "Stop task"}</Text>
          </Pressable>
        ) : null}
      </View>
      {output ? (
        <Text selectable className="font-mono text-xs text-foreground">
          {output.available
            ? `${output.truncated ? "Earlier output omitted.\n" : ""}${output.text || "No output yet."}`
            : "The provider has not exposed output for this task."}
        </Text>
      ) : null}
    </View>
  );
}

function TaskList({
  environmentId,
  threadId,
  onClose,
}: {
  environmentId: EnvironmentId;
  threadId: ThreadId;
  onClose: () => void;
}) {
  const query = useEnvironmentQuery(
    backgroundTaskEnvironment.tasks({ environmentId, input: { threadId } }),
  );
  return (
    <SafeAreaView className="flex-1 bg-screen">
      <View className="flex-row items-center justify-between p-4">
        <Text className="text-lg font-semibold text-foreground">Background Tasks</Text>
        <Pressable accessibilityRole="button" onPress={onClose}>
          <Text className="text-primary">Done</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerClassName="gap-3 p-4">
        {query.error ? (
          <Text accessibilityRole="alert" className="text-destructive">
            {query.error}
          </Text>
        ) : !query.data ? (
          <Text className="text-muted-foreground">Loading tasks…</Text>
        ) : query.data.tasks.length === 0 ? (
          <Text className="text-muted-foreground">
            {query.data.supported
              ? "No background tasks are running."
              : "This provider does not report native background tasks."}
          </Text>
        ) : (
          query.data.tasks.map((task) => (
            <BackgroundTaskDetail
              key={`${task.sessionKey}:${task.taskId}`}
              task={task}
              environmentId={environmentId}
              threadId={threadId}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function BackgroundTasksButton({
  environmentId,
  threadId,
}: {
  environmentId: EnvironmentId;
  threadId: ThreadId;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View background tasks"
        className="px-4 py-2"
        onPress={() => setOpen(true)}
      >
        <Text className="text-sm text-muted-foreground">Background Tasks</Text>
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        {open ? (
          <TaskList
            environmentId={environmentId}
            threadId={threadId}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </Modal>
    </>
  );
}

import { createBackgroundTaskEnvironmentAtoms } from "@t3tools/client-runtime/state/backgroundTasks";
import { connectionAtomRuntime } from "../connection/runtime";
export const backgroundTaskEnvironment =
  createBackgroundTaskEnvironmentAtoms(connectionAtomRuntime);

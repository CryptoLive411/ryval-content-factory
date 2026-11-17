#!/usr/bin/env node
import { runAutopilotFill } from "../src/lib/autopilot-worker.ts";

const result = await runAutopilotFill({ maxPosts: 4 });
console.log(JSON.stringify(result));

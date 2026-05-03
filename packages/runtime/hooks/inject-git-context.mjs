#!/usr/bin/env node

import { evaluateLifecycleContextInjection } from "./_context-injection.mjs";
import { createHookRunner } from "./_runtime.mjs";

createHookRunner("inject-git-context", evaluateLifecycleContextInjection);

#!/usr/bin/env node

import { evaluateContextInjection } from "./_context-injection.mjs";
import { createHookRunner } from "./_runtime.mjs";

createHookRunner("inject-package-scripts", evaluateContextInjection);

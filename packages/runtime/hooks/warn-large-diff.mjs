#!/usr/bin/env node

import { evaluateGeneratedDrift } from "./_generated-drift.mjs";
import { createHookRunner } from "./_runtime.mjs";

createHookRunner("warn-large-diff", evaluateGeneratedDrift);

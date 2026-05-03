#!/usr/bin/env node

import { evaluateGeneratedDrift } from "./_generated-drift.mjs";
import { createHookRunner } from "./_runtime.mjs";

createHookRunner("block-generated-drift", evaluateGeneratedDrift);

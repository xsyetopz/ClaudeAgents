#!/usr/bin/env node

import { evaluateCompletionEvidence } from "./_completion-evidence.mjs";
import { createHookRunner } from "./_runtime.mjs";

createHookRunner("require-validation-evidence", evaluateCompletionEvidence);

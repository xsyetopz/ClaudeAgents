#!/usr/bin/env node

import { evaluateCompletionEvidence } from "./_completion-evidence.mjs";
import { createHookRunner } from "./_runtime.mjs";

createHookRunner("block-weak-blocked", evaluateCompletionEvidence);

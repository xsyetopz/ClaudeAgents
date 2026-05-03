#!/usr/bin/env node

import { createHookRunner } from "./_runtime.mjs";
import { evaluateSecretGuard } from "./_secret-guard.mjs";

createHookRunner("block-secret-files", evaluateSecretGuard);

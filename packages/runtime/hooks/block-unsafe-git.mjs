#!/usr/bin/env node

import { evaluateUnsafeGit } from "./_command-safety.mjs";
import { createHookRunner } from "./_runtime.mjs";

createHookRunner("block-unsafe-git", evaluateUnsafeGit);

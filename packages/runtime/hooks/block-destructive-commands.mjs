#!/usr/bin/env node

import { evaluateDestructiveCommand } from "./_command-safety.mjs";
import { createHookRunner } from "./_runtime.mjs";

createHookRunner("block-destructive-commands", evaluateDestructiveCommand);

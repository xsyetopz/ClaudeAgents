#!/usr/bin/env node

import { evaluateFailureLoop } from "./_failure-loop.mjs";
import { createHookRunner } from "./_runtime.mjs";

createHookRunner("block-repeated-failures", evaluateFailureLoop);

#!/usr/bin/env node

import { evaluateRouteContract } from "./_route-contract.mjs";
import { createHookRunner } from "./_runtime.mjs";

createHookRunner("require-execution-evidence", evaluateRouteContract);

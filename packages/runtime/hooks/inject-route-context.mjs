#!/usr/bin/env node

import { evaluateRouteContextInjection } from "./_context-injection.mjs";
import { createHookRunner } from "./_runtime.mjs";

createHookRunner("inject-route-context", evaluateRouteContextInjection);

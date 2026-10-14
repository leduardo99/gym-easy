import { z } from "zod";

import {
  CONSENT_ACTIONS,
  CONSENT_PURPOSES,
  CONSENT_SOURCES,
} from "@/db/domain";

export const consentInputSchema = z
  .object({
    purpose: z.enum(CONSENT_PURPOSES),
    action: z.enum(CONSENT_ACTIONS),
    source: z.enum(CONSENT_SOURCES),
  })
  .strict();

export type ConsentInput = z.infer<typeof consentInputSchema>;

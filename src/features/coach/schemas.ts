import { z } from "zod";

export const coachPrivacyMutationSchema = z.object({}).strict();

export type CoachPrivacyMutationInput = z.infer<
  typeof coachPrivacyMutationSchema
>;

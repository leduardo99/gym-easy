/**
 * Geração de plano e ajuste semanal são trabalhos longos.
 * O Trigger.dev não está instalado neste repositório. Quando o SDK entrar,
 * registre `generate_plan` e `weekly_adjustment` como tasks e troque esta
 * fila pela implementação real. Até lá a fila recusa o enfileiramento em vez
 * de rodar o trabalho no request.
 */
export type CoachHeavyJob = "generate_plan" | "weekly_adjustment";

export type CoachJobEnqueueResult =
  | { status: "not_configured"; job: CoachHeavyJob }
  | { status: "queued"; job: CoachHeavyJob; id: string };

export interface CoachJobQueue {
  enqueue(
    job: CoachHeavyJob,
    input: { userId: string },
  ): Promise<CoachJobEnqueueResult>;
}

export function createUnconfiguredCoachJobs(): CoachJobQueue {
  return {
    async enqueue(job) {
      return { status: "not_configured", job };
    },
  };
}

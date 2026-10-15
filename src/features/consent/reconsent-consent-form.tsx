"use client";

import { useId, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import type { ConsentCopy } from "@/consent/texts";

import { acceptReconsentAction, refuseReconsentAction } from "./actions";
import {
  COACH_TRANSFER_RISK_HEADING,
  COACH_TRANSFER_RISK_LINE,
  RECONSENT_COPY,
  type ReconsentScope,
  reconsentRefuseRequiresConfirmation,
} from "./reconsent";

function summaryParagraphs(
  body: string,
  hasTransferCheckbox: boolean,
): string[] {
  const paragraphs = body.split("\n").filter((line) => line.length > 0);
  const count = hasTransferCheckbox ? Math.min(3, paragraphs.length) : 1;
  return paragraphs.slice(0, count);
}

function refuseConfirmDescription(scope: ReconsentScope): string {
  if (scope === "body_data") return RECONSENT_COPY.refuseConfirmBodyData;
  if (scope === "coach_health") return RECONSENT_COPY.refuseConfirmCoachHealth;
  if (scope === "coach_chat") return RECONSENT_COPY.refuseConfirmCoachChat;
  return RECONSENT_COPY.refused;
}

export function ReconsentConsentForm({
  copy,
  scope,
  nextPath,
}: {
  copy: ConsentCopy;
  scope: ReconsentScope;
  nextPath: string;
}) {
  const [accepted, setAccepted] = useState(false);
  const [transferAccepted, setTransferAccepted] = useState(false);
  const refuseFormId = useId();
  const requiresTransfer = Boolean(copy.transferCheckbox);
  const canSubmit = accepted && (!requiresTransfer || transferAccepted);
  const summary = summaryParagraphs(copy.body, requiresTransfer);
  const refuseNeedsConfirm = reconsentRefuseRequiresConfirmation(scope);

  return (
    <>
      <div className="mt-6 flex flex-col gap-3">
        {summary.map((paragraph) => (
          <p
            key={paragraph}
            className="text-sm leading-6 text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}
      </div>
      <details className="mt-6 rounded-lg border border-border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          Ler o texto completo
        </summary>
        <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
          {copy.body.split("\n").map((paragraph) => (
            <p
              key={paragraph}
              className="text-sm leading-6 text-muted-foreground"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </details>
      <form action={acceptReconsentAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="next" value={nextPath} />
        <Field orientation="horizontal" className="items-start">
          <input
            id="reconsent-accepted"
            name="accepted"
            type="checkbox"
            value="sim"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          <FieldLabel
            htmlFor="reconsent-accepted"
            className="text-sm leading-5 font-normal"
          >
            {copy.checkbox}
          </FieldLabel>
        </Field>
        {copy.transferCheckbox ? (
          <>
            <p
              className="text-sm leading-6 text-muted-foreground"
              data-testid="coach-transfer-risks"
            >
              <span className="font-medium text-foreground">
                {COACH_TRANSFER_RISK_HEADING}:{" "}
              </span>
              {COACH_TRANSFER_RISK_LINE}
            </p>
            <Field orientation="horizontal" className="items-start">
              <input
                id="reconsent-transfer"
                name="transferAccepted"
                type="checkbox"
                value="sim"
                checked={transferAccepted}
                onChange={(event) => setTransferAccepted(event.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-primary"
              />
              <FieldLabel
                htmlFor="reconsent-transfer"
                className="text-sm leading-5 font-normal"
              >
                {copy.transferCheckbox}
              </FieldLabel>
            </Field>
          </>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!canSubmit}
        >
          {RECONSENT_COPY.accept}
        </Button>
      </form>
      {refuseNeedsConfirm ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mt-3 w-full"
            >
              {RECONSENT_COPY.refuse}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent data-testid="reconsent-refuse-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {RECONSENT_COPY.refuseConfirmTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {refuseConfirmDescription(scope)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <form id={refuseFormId} action={refuseReconsentAction}>
              <input type="hidden" name="scope" value={scope} />
              <input type="hidden" name="next" value={nextPath} />
            </form>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {RECONSENT_COPY.refuseConfirmCancel}
              </AlertDialogCancel>
              <AlertDialogAction type="submit" form={refuseFormId}>
                {RECONSENT_COPY.refuseConfirmAction}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <form action={refuseReconsentAction} className="mt-3">
          <input type="hidden" name="scope" value={scope} />
          <input type="hidden" name="next" value={nextPath} />
          <Button type="submit" variant="outline" size="lg" className="w-full">
            {RECONSENT_COPY.refuse}
          </Button>
        </form>
      )}
    </>
  );
}

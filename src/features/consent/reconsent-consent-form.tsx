"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import type { ConsentCopy } from "@/consent/texts";

import { acceptReconsentAction, refuseReconsentAction } from "./actions";
import { RECONSENT_COPY, type ReconsentScope } from "./reconsent";

function summaryParagraphs(
  body: string,
  hasTransferCheckbox: boolean,
): string[] {
  const paragraphs = body.split("\n").filter((line) => line.length > 0);
  const count = hasTransferCheckbox ? Math.min(3, paragraphs.length) : 1;
  return paragraphs.slice(0, count);
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
  const requiresTransfer = Boolean(copy.transferCheckbox);
  const canSubmit = accepted && (!requiresTransfer || transferAccepted);
  const summary = summaryParagraphs(copy.body, requiresTransfer);

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
      <form action={refuseReconsentAction} className="mt-3">
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="next" value={nextPath} />
        <Button type="submit" variant="outline" size="lg" className="w-full">
          {RECONSENT_COPY.refuse}
        </Button>
      </form>
    </>
  );
}

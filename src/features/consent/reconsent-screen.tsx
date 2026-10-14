import { PageHeader } from "@/components/app/page-header";
import { AppShell } from "@/components/app/bottom-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import type { ConsentCopy } from "@/consent/texts";

import { acceptReconsentAction, refuseReconsentAction } from "./actions";
import { RECONSENT_COPY, type ReconsentScope } from "./reconsent";

export function ReconsentScreen({
  copy,
  scope,
  nextPath,
  notice,
}: {
  copy: ConsentCopy;
  scope: ReconsentScope;
  nextPath: string;
  notice: "refused" | "checkbox" | "origin" | null;
}) {
  const noticeText =
    notice === "refused"
      ? RECONSENT_COPY.refused
      : notice === "checkbox"
        ? RECONSENT_COPY.checkbox
        : notice === "origin"
          ? RECONSENT_COPY.origin
          : null;

  return (
    <AppShell>
      <PageHeader title={copy.title} description={RECONSENT_COPY.intro} />
      <Card className="mt-6">
        <CardContent className="flex flex-col gap-4">
          {copy.body.split("\n").map((paragraph) => (
            <p
              key={paragraph}
              className="text-sm leading-6 text-muted-foreground"
            >
              {paragraph}
            </p>
          ))}
        </CardContent>
      </Card>
      {noticeText ? (
        <Alert
          className="mt-4"
          variant={notice === "refused" ? "default" : "destructive"}
        >
          <AlertDescription>{noticeText}</AlertDescription>
        </Alert>
      ) : null}
      <form action={acceptReconsentAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="next" value={nextPath} />
        <Field orientation="horizontal" className="items-start">
          <input
            id="reconsent-accepted"
            name="accepted"
            type="checkbox"
            value="sim"
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
        <Button type="submit" size="lg" className="w-full">
          {RECONSENT_COPY.accept}
        </Button>
      </form>
      <form action={refuseReconsentAction} className="mt-3">
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="next" value={nextPath} />
        <Button type="submit" variant="outline" size="lg" className="w-full">
          {RECONSENT_COPY.refuse}
        </Button>
      </form>
    </AppShell>
  );
}

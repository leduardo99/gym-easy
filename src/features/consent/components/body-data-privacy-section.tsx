"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

import { revokeBodyDataConsentAction } from "../body-data-actions";
import { BODY_DATA_PRIVACY_COPY } from "../body-data-copy";

export function BodyDataPrivacySection({
  bodyDataGranted,
  grantHref,
}: {
  bodyDataGranted: boolean;
  grantHref: string;
}) {
  const router = useRouter();
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [banner, setBanner] = useState<{
    variant: "default" | "destructive";
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmRevoke() {
    startTransition(async () => {
      const result = await revokeBodyDataConsentAction();
      setRevokeOpen(false);
      if (!result.ok) {
        setBanner({
          variant: "destructive",
          message: result.formError.message,
        });
        return;
      }
      setBanner({
        variant: "default",
        message: BODY_DATA_PRIVACY_COPY.revokeSuccess,
      });
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="body-data-privacy-heading"
      className="mt-10 flex flex-col gap-4"
      data-testid="body-data-privacy-section"
    >
      <div className="flex flex-col gap-2">
        <h2
          id="body-data-privacy-heading"
          className="text-title-2 font-semibold"
        >
          {BODY_DATA_PRIVACY_COPY.sectionTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {BODY_DATA_PRIVACY_COPY.sectionDescription}
        </p>
      </div>
      {banner ? (
        <Alert variant={banner.variant}>
          <AlertDescription>{banner.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex items-center justify-between gap-4 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
        <Label
          htmlFor="body-data-consent-switch"
          className="text-sm font-medium"
        >
          {BODY_DATA_PRIVACY_COPY.sectionTitle}
        </Label>
        <input
          id="body-data-consent-switch"
          type="checkbox"
          role="switch"
          aria-checked={bodyDataGranted}
          checked={bodyDataGranted}
          readOnly
          disabled={pending}
          className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-input transition-colors checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            if (bodyDataGranted) {
              setRevokeOpen(true);
              return;
            }
            router.push(grantHref);
          }}
        />
      </div>
      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent aria-describedby="revoke-body-data-description">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {BODY_DATA_PRIVACY_COPY.revokeTitle}
            </AlertDialogTitle>
            <AlertDialogDescription id="revoke-body-data-description">
              {BODY_DATA_PRIVACY_COPY.revokeDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {BODY_DATA_PRIVACY_COPY.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                confirmRevoke();
              }}
            >
              {BODY_DATA_PRIVACY_COPY.revokeConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

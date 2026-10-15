"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, useTransition } from "react";

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
import {
  BODY_DATA_CONSENT_SWITCH_ID,
  BODY_DATA_PRIVACY_COPY,
  BODY_DATA_PRIVACY_DESCRIPTION_ID,
  BODY_DATA_PRIVACY_STATUS_ID,
} from "../body-data-copy";

type FocusAfterDialog = "switch" | "status";

export function BodyDataPrivacySection({
  bodyDataGranted,
  grantHref,
}: {
  bodyDataGranted: boolean;
  grantHref: string;
}) {
  const router = useRouter();
  const switchRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [focusAfterDialog, setFocusAfterDialog] =
    useState<FocusAfterDialog>("switch");
  const [banner, setBanner] = useState<{
    variant: "default" | "destructive";
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  useLayoutEffect(() => {
    if (revokeOpen) return;
    if (focusAfterDialog === "status" && banner) {
      statusRef.current?.focus();
      return;
    }
    if (focusAfterDialog === "switch") {
      switchRef.current?.focus();
    }
  }, [revokeOpen, focusAfterDialog, banner]);

  function handleRevokeOpenChange(open: boolean) {
    setRevokeOpen(open);
  }

  function confirmRevoke() {
    startTransition(async () => {
      const result = await revokeBodyDataConsentAction();
      if (!result.ok) {
        setFocusAfterDialog("switch");
        setBanner({
          variant: "destructive",
          message: result.formError.message,
        });
        setRevokeOpen(false);
        return;
      }
      setFocusAfterDialog("status");
      setBanner({
        variant: "default",
        message: BODY_DATA_PRIVACY_COPY.revokeSuccess,
      });
      setRevokeOpen(false);
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
        <p
          id={BODY_DATA_PRIVACY_DESCRIPTION_ID}
          className="text-sm text-muted-foreground"
        >
          {BODY_DATA_PRIVACY_COPY.sectionDescription}
        </p>
      </div>
      {banner ? (
        <Alert variant={banner.variant}>
          <AlertDescription
            id={BODY_DATA_PRIVACY_STATUS_ID}
            ref={statusRef}
            tabIndex={-1}
            role="status"
          >
            {banner.message}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex items-center justify-between gap-4 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
        <Label
          htmlFor={BODY_DATA_CONSENT_SWITCH_ID}
          className="text-sm font-medium"
        >
          {BODY_DATA_PRIVACY_COPY.sectionTitle}
        </Label>
        <input
          ref={switchRef}
          id={BODY_DATA_CONSENT_SWITCH_ID}
          type="checkbox"
          role="switch"
          aria-checked={bodyDataGranted}
          aria-describedby={BODY_DATA_PRIVACY_DESCRIPTION_ID}
          checked={bodyDataGranted}
          readOnly
          disabled={pending}
          className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-input transition-colors checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            if (bodyDataGranted) {
              setFocusAfterDialog("switch");
              setRevokeOpen(true);
              return;
            }
            router.push(grantHref);
          }}
          onKeyDown={(event) => {
            if (event.key !== " " && event.key !== "Enter") return;
            event.preventDefault();
            if (bodyDataGranted) {
              setFocusAfterDialog("switch");
              setRevokeOpen(true);
              return;
            }
            router.push(grantHref);
          }}
        />
      </div>
      <AlertDialog open={revokeOpen} onOpenChange={handleRevokeOpenChange}>
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
            <AlertDialogCancel
              disabled={pending}
              onClick={() => setFocusAfterDialog("switch")}
            >
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

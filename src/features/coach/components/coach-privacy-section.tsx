"use client";

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import {
  deleteCoachChatHistoryAction,
  revokeCoachChatConsentAction,
  revokeCoachHealthConsentAction,
} from "../actions";
import { COACH_PRIVACY_COPY } from "../copy";

type DialogKind = "delete" | "withdrawHealth" | "withdrawChat" | null;

export function CoachPrivacySection() {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [banner, setBanner] = useState<{
    variant: "default" | "destructive";
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function runAction(kind: Exclude<DialogKind, null>) {
    startTransition(async () => {
      const result =
        kind === "delete"
          ? await deleteCoachChatHistoryAction()
          : kind === "withdrawHealth"
            ? await revokeCoachHealthConsentAction()
            : await revokeCoachChatConsentAction();
      setDialog(null);
      if (!result.ok) {
        setBanner({
          variant: "destructive",
          message: result.formError.message,
        });
        return;
      }
      setBanner({
        variant: "default",
        message:
          kind === "delete"
            ? COACH_PRIVACY_COPY.deleteSuccess
            : kind === "withdrawHealth"
              ? COACH_PRIVACY_COPY.withdrawHealthSuccess
              : COACH_PRIVACY_COPY.withdrawChatSuccess,
      });
    });
  }

  return (
    <section
      aria-labelledby="coach-privacy-heading"
      className="mt-10 flex flex-col gap-4"
      data-testid="coach-privacy-section"
    >
      <div className="flex flex-col gap-2">
        <h2 id="coach-privacy-heading" className="text-title-2 font-semibold">
          {COACH_PRIVACY_COPY.sectionTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {COACH_PRIVACY_COPY.sectionDescription}
        </p>
      </div>
      {banner ? (
        <Alert variant={banner.variant}>
          <AlertDescription>{banner.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-3">
        <AlertDialog
          open={dialog === "delete"}
          onOpenChange={(open) => setDialog(open ? "delete" : null)}
        >
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
            >
              {COACH_PRIVACY_COPY.deleteHistory}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent aria-describedby="delete-history-description">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {COACH_PRIVACY_COPY.deleteHistoryTitle}
              </AlertDialogTitle>
              <AlertDialogDescription id="delete-history-description">
                {COACH_PRIVACY_COPY.deleteHistoryDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>
                {COACH_PRIVACY_COPY.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={pending}
                onClick={(event) => {
                  event.preventDefault();
                  runAction("delete");
                }}
              >
                {COACH_PRIVACY_COPY.deleteHistoryConfirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={dialog === "withdrawHealth"}
          onOpenChange={(open) => setDialog(open ? "withdrawHealth" : null)}
        >
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="w-full"
            >
              {COACH_PRIVACY_COPY.withdrawHealth}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent aria-describedby="withdraw-health-description">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {COACH_PRIVACY_COPY.withdrawHealthTitle}
              </AlertDialogTitle>
              <AlertDialogDescription id="withdraw-health-description">
                {COACH_PRIVACY_COPY.withdrawHealthDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>
                {COACH_PRIVACY_COPY.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={pending}
                onClick={(event) => {
                  event.preventDefault();
                  runAction("withdrawHealth");
                }}
              >
                {COACH_PRIVACY_COPY.withdrawHealthConfirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={dialog === "withdrawChat"}
          onOpenChange={(open) => setDialog(open ? "withdrawChat" : null)}
        >
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="w-full"
            >
              {COACH_PRIVACY_COPY.withdrawChat}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent aria-describedby="withdraw-chat-description">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {COACH_PRIVACY_COPY.withdrawChatTitle}
              </AlertDialogTitle>
              <AlertDialogDescription id="withdraw-chat-description">
                {COACH_PRIVACY_COPY.withdrawChatDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>
                {COACH_PRIVACY_COPY.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={pending}
                onClick={(event) => {
                  event.preventDefault();
                  runAction("withdrawChat");
                }}
              >
                {COACH_PRIVACY_COPY.withdrawChatConfirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}

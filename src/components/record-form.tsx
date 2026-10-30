"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveRecord } from "@/app/actions";
import { preserveFormValues } from "./preserve-form";

export function RecordForm({
  kind,
  id,
  version,
  children,
  cancel,
  label = "Simpan",
  submissionId,
}: {
  kind: string;
  id?: string;
  version?: number;
  children: React.ReactNode;
  cancel: string;
  label?: string;
  submissionId: string;
}) {
  const [state, action, pending] = useActionState(saveRecord, {});
  const [nonce] = useState(submissionId);
  const router = useRouter();
  useEffect(() => {
    if (state.redirectTo) router.replace(state.redirectTo);
  }, [state.redirectTo, router]);
  return (
    <form
      action={action}
      onSubmit={(e) => preserveFormValues(e.currentTarget)}
      className="record-form"
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id || ""} />
      <input type="hidden" name="version" value={version || ""} />
      <input type="hidden" name="submissionId" value={nonce} />
      {children}
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="form-actions">
        <Link className="button" href={cancel}>
          Batal
        </Link>
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : label}
        </button>
      </div>
    </form>
  );
}

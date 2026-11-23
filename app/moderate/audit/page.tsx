import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuditActionBadge } from "@/components/audit-action";
import { PageTitle } from "@/components/page-title";
import { formatDateTime } from "@/lib/format";
import { LIMITS } from "@/lib/sandbox";
import { getGate } from "@/lib/server/gate";
import type { AuditRow } from "@/lib/policy";

export const metadata: Metadata = { title: "Audit log" };

const ROLE_LABEL = { member: "Member", moderator: "Moderator", admin: "Admin" } as const;

function Target({ row }: { row: AuditRow }) {
  return row.target ? (
    <Link href={`/moderate/${row.target.id}`} className="underline-offset-4 hover:underline">{row.target.name}</Link>
  ) : (
    <>{row.targetId}</>
  );
}

export default async function AuditPage() {
  const { viewer, policy } = await getGate();
  if (!policy.can(viewer, "audit.read")) notFound();
  const rows = policy.listAudit(viewer);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle eyebrow="Staff only" title="Audit log">
        Every decision and every change that affects who can see whom: actor, action, target, reason and time, newest first.
        In production this is an append-only table that keeps every entry. This demo keeps your latest {LIMITS.log} entries in
        your cookie, plus your signup record, on top of the seeded history.
      </PageTitle>

      {/* Phones: one entry per card, nothing hidden off to the side. */}
      <ol className="flex flex-col gap-2 md:hidden" data-testid="audit-cards">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-1.5 rounded-xl bg-card p-3 text-sm ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-center gap-2">
              <AuditActionBadge action={row.action} />
              <span className="text-xs text-muted-foreground">{formatDateTime(row.at)}</span>
            </div>
            <p>
              <span className="font-medium">{row.actor?.name ?? row.actorId}</span>
              <span className="text-muted-foreground"> ({row.actor ? ROLE_LABEL[row.actor.role] : "Unknown"})</span>
              {row.actorId === row.targetId ? (
                <span className="text-muted-foreground">, own profile</span>
              ) : (
                <>
                  <span className="text-muted-foreground"> on </span>
                  <Target row={row} />
                </>
              )}
            </p>
            {row.reason ? <p className="text-muted-foreground">{row.reason}</p> : null}
          </li>
        ))}
      </ol>

      <div className="hidden overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 md:block">
        <Table data-testid="audit">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Time (UTC)</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="pr-4">Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="pl-4 text-muted-foreground">{formatDateTime(row.at).replace(" UTC", "")}</TableCell>
                <TableCell>
                  <span className="font-medium">{row.actor?.name ?? row.actorId}</span>
                  <span className="block text-xs text-muted-foreground">{row.actor ? ROLE_LABEL[row.actor.role] : "Unknown"}</span>
                </TableCell>
                <TableCell><AuditActionBadge action={row.action} /></TableCell>
                <TableCell><Target row={row} /></TableCell>
                <TableCell className="min-w-64 pr-4 whitespace-normal text-muted-foreground">{row.reason ?? "None"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

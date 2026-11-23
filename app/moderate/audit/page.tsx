import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuditActionBadge } from "@/components/audit-action";
import { PageTitle } from "@/components/page-title";
import { formatDateTime } from "@/lib/format";
import { getGate } from "@/lib/server/gate";

export const metadata: Metadata = { title: "Audit log" };

const ROLE_LABEL = { member: "Member", moderator: "Moderator", admin: "Admin" } as const;

export default async function AuditPage() {
  const { viewer, policy } = await getGate();
  if (!policy.can(viewer, "audit.read")) notFound();
  const rows = policy.listAudit(viewer);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle eyebrow="Staff only" title="Audit log">
        Every decision and every change that affects who can see whom: actor, action, target, reason and time, newest first.
        In production this is an append-only table; here your own entries sit on top of the seeded history.
      </PageTitle>
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
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
                <TableCell>
                  {row.target ? (
                    <Link href={`/moderate/${row.target.id}`} className="underline-offset-4 hover:underline">{row.target.name}</Link>
                  ) : (
                    row.targetId
                  )}
                </TableCell>
                <TableCell className="max-w-[22rem] pr-4 whitespace-normal text-muted-foreground">{row.reason ?? "None"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

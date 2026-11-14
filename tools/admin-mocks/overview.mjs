// The overview's work queue and Recent changes, shared by the mocks (build.mjs) and the e2e
// stub of GET /api/admin/overview (export-e2e.mjs), so both draw the same lines (L2-274, L2-275).
import { getEntity, lookup, rowName } from "./entities.mjs";

export const name = (entity, id) => {
  const hit = lookup(entity, id);
  return hit ? rowName(hit.row) : String(id);
};
// The work queue (L2-274 AC2). "Next" describes the oldest record waiting as the API does: what it
// is about, else its name. "Listings to review" and "Access requests" of the design are not
// shown: nothing waits for review (ADR 0057) and an access request carries no decision (L2-114).
export const QUEUES = [
  {
    title: "Safety",
    note: "Answer within 24 hours",
    items: [
      {
        entity: "securityAlerts",
        when: (r) => r.status === "open",
        describe: (r) => r.kind,
        age: "oldest 3h",
        urgent: true,
      },
      {
        entity: "listingReports",
        when: (r) => r.status === "open",
        describe: (r) => name("listings", r.listingId),
        age: "oldest 3d",
        urgent: true,
      },
      {
        entity: "conversationReports",
        when: (r) => r.status === "open" || r.status === "in review",
        describe: (r) => r.reason,
        age: "oldest 3d",
      },
      {
        entity: "reviewReports",
        when: (r) => r.status === "open",
        describe: (r) => `Marked ${r.reason}`,
        age: "oldest 2d",
      },
    ],
  },
  {
    title: "Waiting on us",
    note: "Members are waiting for a decision",
    items: [
      {
        entity: "dataExports",
        label: "Data exports not delivered",
        when: (r) => r.status === "failed" || r.status === "processing",
        describe: (r) => name("members", r.memberId),
        age: "oldest 10d",
      },
      {
        entity: "feedback",
        label: "New feedback",
        when: (r) => r.status === "new",
        describe: (r) => `“${r.body}”`,
        age: "oldest 1d",
      },
    ],
  },
];

export function verb(action) {
  const [table, v] = action.split(".");
  const words = {
    update: "updated",
    create: "created",
    read: "read",
    delete: "deleted",
  };
  return `${words[v] ?? v} ${table
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .replace(/s$/, "")}`;
}

/** The mock's age of a line's oldest record, "oldest 3d", as hours. */
function hoursOf(age) {
  const m = /(\d+)([hd])/.exec(age);
  return m ? Number(m[1]) * (m[2] === "d" ? 24 : 1) : 0;
}

const kebab = (key) => key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/**
 * The overview as GET /api/admin/overview answers it, from the mocks' rows: `now` is the e2e
 * clock and `instant` turns a mock's "18 Nov 02:00" into an ISO instant.
 */
export function overviewApi(now, instant) {
  const sections = QUEUES.map((s) => ({
    title: s.title,
    note: s.note,
    lines: s.items
      .map((q) => {
        const e = getEntity(q.entity);
        const hits = e.rows.filter((row) => q.when(row));
        if (hits.length === 0) return null;
        return {
          table: kebab(q.entity),
          label: q.label ?? e.label,
          count: hits.length,
          urgent: q.urgent === true,
          nextId: hits[0].id,
          next: q.describe(hits[0]),
          oldestAt: new Date(
            now.getTime() - hoursOf(q.age) * 3_600_000,
          ).toISOString(),
        };
      })
      .filter(Boolean),
  }));
  const jobs = getEntity("jobRuns").rows.filter((r) => r.status === "failed");
  const outbox = getEntity("outboxMessages").rows.filter(
    (r) => r.status === "dead" || r.status === "retrying",
  );
  const maint = getEntity("maintenanceWindows").rows.find(
    (r) => r.status === "scheduled",
  );
  const system = [
    ...jobs.map((j) => ({
      kind: "failed",
      table: "job-runs",
      subject: j.job,
      at: instant(j.startedAt),
    })),
    ...outbox.map((o) =>
      o.status === "dead"
        ? {
            kind: "gave-up",
            table: "outbox-messages",
            subject: o.topic,
            at: instant(o.createdAt),
            attempts: o.attempts,
          }
        : {
            kind: "retrying",
            table: "outbox-messages",
            subject: o.topic,
            at: instant(o.nextAttemptAt),
            attempts: o.attempts,
          },
    ),
    ...(maint
      ? [
          {
            kind: "maintenance",
            table: "maintenance-windows",
            subject: null,
            at: instant(maint.startsAt),
            until: instant(maint.endsAt),
          },
        ]
      : []),
  ];
  const staff = getEntity("staff");
  const changes = getEntity("auditRecords")
    .rows.slice(0, 4)
    .map((a) => {
      const who = staff.rows.find((s) => s.id === a.actorId);
      return {
        actor: who ? String(who.name).split(" ")[0] : a.actorId,
        what: verb(String(a.action)),
        table: kebab(String(a.action).split(".")[0]),
        recordId: a.recordId,
        at: instant(a.occurredAt),
      };
    });
  return {
    waiting: sections.reduce(
      (n, s) => n + s.lines.reduce((m, l) => m + l.count, 0),
      0,
    ),
    since: { members: 14, listings: 3, orders: 5, requests: 212 },
    sections,
    system,
    changes,
  };
}

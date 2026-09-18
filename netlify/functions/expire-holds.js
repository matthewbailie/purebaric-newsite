// Scheduled hourly (see netlify.toml). Walks waitlist:
//   1. Any hold entry past holdExpiresAt → mark expired.
//   2. If a chamber is then still unoccupied today, auto-promote the next queued
//      entry to a 24h hold + send notify email.
const {
  listWaitlist,
  updateWaitlistEntry,
  countAvailableToday,
  autoTransitionRentals,
  store,
  STORES,
  nowIso,
} = require("./_lib/storage");
const { notifyWaitlistChamberAvailable } = require("./_lib/email");

const HOLD_MS = 24 * 60 * 60 * 1000;

exports.handler = async () => {
  const expiredIds = [];
  const promotedIds = [];
  let rentalTransitions = [];

  try {
    const now = Date.now();

    // 0. Auto-transition rentals (scheduled → active → completed by date)
    const rentResult = await autoTransitionRentals();
    rentalTransitions = rentResult.transitioned;

    // 1. Expire stale holds
    const holds = await listWaitlist({ status: "hold" });
    for (const h of holds) {
      if (h.holdExpiresAt && new Date(h.holdExpiresAt).getTime() < now) {
        await updateWaitlistEntry(h.id, { status: "expired" });
        expiredIds.push(h.id);
      }
    }

    // 2. Auto-promote next queued entry for any available chamber
    const { available, busyIds } = await countAvailableToday();
    if (available > 0) {
      const chambersStore = store(STORES.chambers);
      const { blobs } = await chambersStore.list();
      const fetched = await Promise.all(blobs.map(({ key }) => chambersStore.get(key, { type: "json" })));
      const allChambers = fetched.filter((c) => c && c.status === "active" && !busyIds.includes(c.id));
      const queued = await listWaitlist({ status: "queued" });

      const pairs = Math.min(allChambers.length, queued.length);
      for (let i = 0; i < pairs; i++) {
        const chamber = allChambers[i];
        const entry = queued[i];
        const holdExpiresAt = new Date(now + HOLD_MS).toISOString();
        const updated = await updateWaitlistEntry(entry.id, {
          status: "hold",
          notifiedChamberId: chamber.id,
          notifiedAt: nowIso(),
          holdExpiresAt,
        });
        notifyWaitlistChamberAvailable(updated, chamber).catch((err) =>
          console.error("notify failed during expire-holds", err)
        );
        promotedIds.push(entry.id);
      }
    }

    console.log("expire-holds done", { expired: expiredIds.length, promoted: promotedIds.length, rentalTransitions: rentalTransitions.length });
    return { statusCode: 200, body: JSON.stringify({ expired: expiredIds, promoted: promotedIds, rentalTransitions }) };
  } catch (err) {
    console.error("expire-holds error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "expire_holds_failed" }) };
  }
};

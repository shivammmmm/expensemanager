import { connectDB, Models } from "./db.js";

async function main() {
  await connectDB();

  const total = await Models.Client.countDocuments({});
  console.log(`[migrate] clients total: ${total}`);

  // Backfill strategy: infer staff from Collection and SentPayment records by matching client name.
  // 1) Update by Collection.source -> Client.name
  const collections = await Models.Collection.find({
    source: { $exists: true, $ne: "" },
  }).lean();
  let updatedFromCollection = 0;

  for (const c of collections) {
    const clientName = c.source?.trim();
    if (!clientName) continue;

    const res = await Models.Client.updateMany(
      {
        name: clientName,
        $or: [{ staff_id: "" }, { staff_id: { $exists: false } }],
      },
      { $set: { staff_id: c.staff_id || "", staff_name: c.staff_name || "" } }
    );
    updatedFromCollection += res.modifiedCount || 0;
  }

  console.log(`[migrate] updatedFromCollection: ${updatedFromCollection}`);

  // 2) Update by SentPayment.sent_to -> Client.name
  const sent = await Models.SentPayment.find({
    sent_to: { $exists: true, $ne: "" },
  }).lean();
  let updatedFromSent = 0;

  for (const s of sent) {
    const clientName = s.sent_to?.trim();
    if (!clientName) continue;

    const res = await Models.Client.updateMany(
      {
        name: clientName,
        $or: [{ staff_id: "" }, { staff_id: { $exists: false } }],
      },
      { $set: { staff_id: s.staff_id || "", staff_name: s.staff_name || "" } }
    );
    updatedFromSent += res.modifiedCount || 0;
  }

  console.log(`[migrate] updatedFromSent: ${updatedFromSent}`);

  const stillMissing = await Models.Client.countDocuments({
    staff_id: { $in: ["", null] },
  });
  console.log(`[migrate] stillMissing staff_id: ${stillMissing}`);
}

main()
  .then(() => {
    console.log("[migrate] done");
    process.exit(0);
  })
  .catch((e) => {
    console.error("[migrate] failed", e);
    process.exit(1);
  });

import "../src/config.js";
import { database } from "../src/mongo.js";
import {
  derivePaymentLine1,
  derivePaymentLine2,
  deriveReceivedFrom,
  deriveShortPlace,
  terbilangRupiah,
} from "../src/receipt.js";

async function main() {
  const db = await database();

  const trips = await db.collection("trips").find({}).toArray();
  for (const doc of trips) {
    const origin = String(doc.origin || "");
    const destination = String(doc.destination || "");
    const originShort = String(doc.originShort || deriveShortPlace(origin));
    const destinationShort = String(doc.destinationShort || deriveShortPlace(destination));
    const receivedFrom = deriveReceivedFrom(doc.receivedFrom as string | undefined, originShort);
    const paymentLine1 = derivePaymentLine1(doc.paymentLine1 as string | undefined);
    const paymentLine2 = derivePaymentLine2(
      doc.paymentLine2 as string | undefined,
      originShort,
      destinationShort,
    );
    const paymentMethod = doc.paymentMethod === "transfer" ? "transfer" : "cash";
    const total = Number(doc.total) || 0;
    const terbilang = terbilangRupiah(total);
    const searchText = [
      doc.seriesCode,
      doc.driverName,
      doc.driverPhone,
      receivedFrom,
      originShort,
      origin,
      destinationShort,
      destination,
      paymentLine1,
      paymentLine2,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .slice(0, 800);

    await db.collection("trips").updateOne(
      { _id: doc._id },
      {
        $set: {
          origin,
          originShort,
          destination,
          destinationShort,
          receivedFrom,
          paymentLine1,
          paymentLine2,
          paymentMethod,
          total,
          terbilang,
          searchText,
        },
      },
    );
  }

  await Promise.all([
    db.collection("drivers").createIndex({ name: 1 }),
    db.collection("series").createIndex({ status: 1, sequence: 1 }),
    db.collection("series").createIndex({ prefix: 1 }),
    db.collection("trips").createIndex({ seriesCode: 1 }),
    db.collection("trips").createIndex({ driverPhone: 1, confirmedAt: -1 }),
    db.collection("trips").createIndex({ confirmedAt: -1 }),
    db.collection("trips").createIndex({ originShort: 1 }),
    db.collection("trips").createIndex({ destinationShort: 1 }),
    db.collection("chat_logs").createIndex({ createdAt: -1 }),
    db.collection("chat_logs").createIndex({ phone: 1, createdAt: -1 }),
  ]);

  const updated = await db.collection("trips").find({}).toArray();
  console.log(`Sinkronisasi selesai (${updated.length} dokumen perjalanan):`);
  console.log(JSON.stringify(updated, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal menyinkronkan database:", err);
  process.exit(1);
});

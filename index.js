const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp, getApps, getApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const axios = require("axios");

const app = getApps().length ? getApp() : initializeApp();
const FIRESTORE_DATABASE_ID = "ai-studio-e6b0d909-8f4a-46f5-8022-a3a73a8594f8";
const db = getFirestore(app, FIRESTORE_DATABASE_ID);

// Replace placeholders or set META_PHONE_NUMBER_ID & META_ACCESS_TOKEN in Functions environment
const PHONE_NUMBER_ID =
  process.env.META_PHONE_NUMBER_ID ||
  process.env.WHATSAPP_PHONE_NUMBER_ID ||
  "<TERA_PHONE_NUMBER_ID>";
const ACCESS_TOKEN =
  process.env.META_ACCESS_TOKEN ||
  process.env.WHATSAPP_ACCESS_TOKEN ||
  "<TERA_ACCESS_TOKEN>";

exports.autoSendVarganiReceipt = onDocumentCreated(
  {
    document: "donations/{docId}",
    database: FIRESTORE_DATABASE_ID,
  },
  async (event) => {
    const data = event.data?.data();
    if (!data || !data.phone || !data.receiptImageUrl) return;
    if (data.whatsappStatus !== "pending") return;
    if (
      !PHONE_NUMBER_ID ||
      PHONE_NUMBER_ID.startsWith("<") ||
      !ACCESS_TOKEN ||
      ACCESS_TOKEN.startsWith("<")
    ) {
      return;
    }

    const digits = String(data.phone).replace(/\D/g, "");
    if (digits.length < 10) {
      const invalidMsg = "Invalid 10-digit WhatsApp mobile number.";
      await event.data.ref.update({
        whatsappStatus: "failed",
        whatsappError: invalidMsg,
      });
      if (data.mandalId && data.utsavId && data.entryId) {
        await db
          .doc(`mandals/${data.mandalId}/utsavs/${data.utsavId}/entries/${data.entryId}`)
          .update({
            whatsappStatus: "failed",
            whatsappError: invalidMsg,
          })
          .catch(() => {});
      }
      return;
    }

    const toPhone = `91${digits.slice(-10)}`;

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: toPhone,
          type: "template",
          template: {
            name: "vargani_receipt",
            language: { code: "en" },
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "image",
                    image: { link: String(data.receiptImageUrl) },
                  },
                ],
              },
              {
                type: "body",
                parameters: [
                  { type: "text", text: String(data.donorName || "Donor") },
                  { type: "text", text: String(data.mandalName || "Peaceful Group") },
                  { type: "text", text: String(data.amount) },
                  { type: "text", text: String(data.receiptNo) },
                ],
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      const wamid = response.data?.messages?.[0]?.id;
      const sentPatch = {
        whatsappStatus: "sent",
        ...(wamid ? { whatsappMessageId: String(wamid) } : {}),
      };

      await event.data.ref.update(sentPatch);

      if (data.mandalId && data.utsavId && data.entryId) {
        await db
          .doc(`mandals/${data.mandalId}/utsavs/${data.utsavId}/entries/${data.entryId}`)
          .update({
            ...sentPatch,
            whatsappError: FieldValue.delete(),
          })
          .catch((syncErr) => {
            console.error("Failed to sync sent status to ledger entry:", syncErr);
          });
      }
    } catch (error) {
      const errMessage = String(
        error.response?.data?.error?.message || error.message || "WhatsApp delivery failed"
      ).slice(0, 480);

      console.error("WhatsApp Auto-Send Error:", error.response?.data || error.message);

      await event.data.ref.update({
        whatsappStatus: "failed",
        whatsappError: errMessage,
      });

      if (data.mandalId && data.utsavId && data.entryId) {
        const entryRef = db.doc(
          `mandals/${data.mandalId}/utsavs/${data.utsavId}/entries/${data.entryId}`
        );

        if (data.creditDeducted === true) {
          const mandalRef = db.doc(`mandals/${data.mandalId}`);
          await db
            .runTransaction(async (tx) => {
              const mandalSnap = await tx.get(mandalRef);
              const ownerUid = String(
                mandalSnap.data()?.user_id || mandalSnap.data()?.ownerId || data.user_id || ""
              );
              tx.update(entryRef, {
                whatsappStatus: "failed",
                whatsappError: errMessage,
              });
              if (mandalSnap.exists) {
                tx.update(mandalRef, {
                  whatsappCredits: FieldValue.increment(1),
                  whatsapp_credits: FieldValue.increment(1),
                  updatedAt: FieldValue.serverTimestamp(),
                });
                tx.set(db.collection(`mandals/${data.mandalId}/wallet_transactions`).doc(), {
                  user_id: ownerUid || String(data.mandalId),
                  type: "failed_refund",
                  creditsDelta: 1,
                  amountInr: 0,
                  packName: `Refund ${data.receiptNo || ""}`.trim(),
                  createdAt: FieldValue.serverTimestamp(),
                });
              }
            })
            .catch((refundErr) => {
              console.error("Failed to sync failure/refund to ledger entry:", refundErr);
            });
        } else {
          await entryRef
            .update({
              whatsappStatus: "failed",
              whatsappError: errMessage,
            })
            .catch((syncErr) => {
              console.error("Failed to sync failed status to ledger entry:", syncErr);
            });
        }
      }
    }
  }
);

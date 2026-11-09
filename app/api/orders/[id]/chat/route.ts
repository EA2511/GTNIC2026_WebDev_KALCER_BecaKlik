import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sharedStore } from "@/lib/sharedStore";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);

    if (!orderId) {
      return NextResponse.json({ messages: [] });
    }

    // Ambil pesan real-time langsung dari sharedStore (Instan < 1ms & sinkron antara Pelanggan dan Driver)
    let sharedMessages = sharedStore.getChatMessages(orderId);
    if (!sharedMessages || sharedMessages.length === 0) {
      try {
        const dbMsgs = await prisma.chatMessage.findMany({
          where: { orderId },
          orderBy: { createdAt: "asc" },
        });
        if (dbMsgs && dbMsgs.length > 0) {
          sharedMessages = dbMsgs.map((m) => ({
            id: m.id,
            orderId: m.orderId,
            senderRole: m.senderRole as "PENUMPANG" | "DRIVER" | "ADMIN",
            senderId: m.senderId ?? undefined,
            senderNama: m.senderNama,
            pesan: m.pesan,
            createdAt: m.createdAt.toISOString(),
          }));
        }
      } catch {
        // ignore db query error
      }
    }
    return NextResponse.json({ messages: sharedMessages || [] });
  } catch (error) {
    console.error("Error in GET /api/orders/[id]/chat:", error);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    const body = await request.json().catch(() => ({}));
    const { id: incomingId, pesan, senderRole, senderNama, senderId, createdAt: incomingCreatedAt } = body;

    if (!pesan || !String(pesan).trim()) {
      return NextResponse.json({ message: "Pesan tidak boleh kosong." }, { status: 400 });
    }

    let actualSenderId = Number(senderId) || 1;
    const actualSenderRole: "PENUMPANG" | "DRIVER" | "ADMIN" =
      senderRole === "DRIVER" ? "DRIVER" : senderRole === "ADMIN" ? "ADMIN" : "PENUMPANG";
    let actualSenderNama =
      senderNama && String(senderNama).trim()
        ? String(senderNama).trim()
        : actualSenderRole === "DRIVER"
        ? "Budi Santoso (Driver BL-001)"
        : "Penumpang";

    try {
      const session = await getSession();
      if (session && session.userId && !senderRole) {
        actualSenderId = session.userId;
        actualSenderNama = session.nama || actualSenderNama;
      }
    } catch {
      // ignore session error
    }

    // 1. Simpan instan ke sharedStore agar langsung tampil di tab Pelanggan & Driver
    const sharedMsg = sharedStore.addChatMessage(orderId, {
      id: Number(incomingId) || undefined,
      senderRole: actualSenderRole,
      senderId: actualSenderId,
      senderNama: actualSenderNama,
      pesan: String(pesan).trim().slice(0, 500),
      createdAt: incomingCreatedAt ? String(incomingCreatedAt) : undefined,
    });

    // 2. Sinkronkan ke Prisma secara non-blocking
    void prisma.chatMessage
      .create({
        data: {
          orderId,
          senderRole: actualSenderRole,
          senderId: actualSenderId,
          senderNama: actualSenderNama,
          pesan: sharedMsg.pesan,
        },
      })
      .catch(() => {});

    return NextResponse.json({ success: true, message: sharedMsg });
  } catch (error) {
    console.error("Error in POST /api/orders/[id]/chat:", error);
    return NextResponse.json(
      { message: "Gagal mengirim pesan." },
      { status: 500 }
    );
  }
}

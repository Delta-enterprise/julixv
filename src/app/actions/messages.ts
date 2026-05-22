"use server";

import { z } from "zod";
import { db } from "@/server/db";

const MessageSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  message: z.string().min(1, "Message cannot be empty"),
  from: z.string().min(1, "Sender name is required"),
});

export async function create_message({
  eventId,
  message,
  from,
}: z.infer<typeof MessageSchema>) {
  try {
    const validated = MessageSchema.parse({ eventId, message, from });

    const newMessage = await db.message.create({
      data: {
        eventId: validated.eventId,
        message: validated.message,
        from: validated.from,
      },
    });

    return {
      status: 200,
      data: newMessage,
      message: "Mensaje creado correctamente",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        error: error.message,
        message: "Validación fallida",
      };
    }
    console.error("Unexpected error:", error);
    return {
      status: 500,
      error: error instanceof z.ZodError ? error.message : "error",
      message: "Error al crear el mensaje",
    };
  }
}
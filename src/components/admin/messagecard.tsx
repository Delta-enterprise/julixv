"use client";
import { Message } from "@prisma/client";
import React from "react";
import { Heart, Trash2 } from "lucide-react";
import { AlertModal } from "./alert-modal";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

export const MessageCard = ({
  message,
 
}: {
  message: Message;

}) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

//   const handleDelete = async (id: string) => {
//     setLoading(true);
//     const res = await delete_message(id);
//     if (res.status === 200) {
//       setMessages(messages.filter((m) => m.id !== id));
//       toast({ title: "Mensaje eliminado correctamente" });
//     } else {
//       toast({
//         title: "Error al eliminar mensaje",
//         description: "Por favor, inténtelo de nuevo.",
//         variant: "destructive",
//       });
//     }
//     setLoading(false);
//   };

  const formattedDate = new Date(message.createdAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      {/* <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          handleDelete(message.id);
          setOpen(false);
        }}
        loading={loading}
      /> */}

      <div className="relative bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4 overflow-hidden">
        {/* Decorative heart background */}
        <div className="absolute top-2 right-2 opacity-10">
          <Heart className="h-12 w-12 text-red-500 fill-red-500" />
        </div>

        {/* Header with sender and delete button */}
        <div className="flex items-start justify-between mb-3 relative z-10">
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">
              De parte de
            </p>
            <h3 className="text-lg font-bold text-gray-900 truncate">
              {message.from || "Anónimo"}
            </h3>
          </div>
          {/* <Button
            onClick={() => setOpen(true)}
            disabled={loading}
            title="Eliminar mensaje"
            variant="ghost"
            size="sm"
            className="hover:bg-red-100 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button> */}
        </div>

        {/* Message content */}
        <div className="mb-3 relative z-10">
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.message}
          </p>
        </div>

        {/* Footer with date */}
        <div className="flex items-center justify-end text-xs text-gray-500 relative z-10">
          <span>{formattedDate}</span>
        </div>
      </div>
    </>
  );
};
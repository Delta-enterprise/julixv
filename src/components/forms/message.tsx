"use client";

import { useRef, useState } from "react";
import { useInView } from "framer-motion";
import { create_message } from "@/app/actions/messages";
import { toast } from "@/components/ui/use-toast";

function MessageSection({ event_id }: { event_id: string }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref);
  const [msg, setMsg] = useState("");
  const [sender, setSender] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await create_message({
        eventId: event_id,
        message: msg,
        from: sender,
      });

      if (res.status === 200) {
        setSent(true);
        toast({
          title: "¡Mensaje enviado!",
          description: "Tu mensaje fue guardado correctamente.",
        });
      } else {
        toast({
          title: "Error",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Algo salió mal al enviar tu mensaje.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="message" ref={ref}>
      <div className="msg-eyebrow">/03 — MENSAJE</div>
      <h2 className={`msg-title ${inView ? "is-in" : ""}`}>
        <span>DEJALE UN</span>
        <span className="msg-title-accent">MENSAJE</span>
        <span>A JULI</span>
      </h2>

      {sent ? (
        <div className="msg-sent">
          <div className="msg-sent-mark">♥</div>
          <p>MENSAJE ENVIADO</p>
          <button
            type="button"
            className="msg-again"
            onClick={() => {
              setSent(false);
              setMsg("");
              setSender("");
            }}
          >
            ESCRIBIR OTRO
          </button>
        </div>
      ) : (
        <form className="msg-form" onSubmit={handleSubmit}>
          <textarea
            className="msg-textarea"
            placeholder="Escribí algo lindo para ella..."
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={5}
            required
            disabled={loading}
          />
          <div className="msg-bottom">
            <input
              className="msg-from"
              type="text"
              placeholder="DE PARTE DE..."
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              required
              disabled={loading}
            />
            <button type="submit" className="msg-send" disabled={loading}>
              {loading ? "ENVIANDO..." : "ENVIAR"}
              <svg
                width="22"
                height="14"
                viewBox="0 0 22 14"
                fill="none"
              >
                <path
                  d="M0 7H20M20 7L14 1M20 7L14 13"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default MessageSection;
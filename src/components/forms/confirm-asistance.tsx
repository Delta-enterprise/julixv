"use client";

import { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "../ui/use-toast";
import { LoadingSpinner } from "@/components/loading";
import { create_guests, sendAttendeeConfirmationEmail } from "@/app/actions/guests";
import { useInView } from "framer-motion";

type DietRestriction = "no" | "si";

const MAX_COMPANIONS = 5;

const CompanionSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  phone: z
    .string()
    .regex(/^[\+]?[0-9\s\-\(\)]{10,}$/, "Ingresa un teléfono válido."),
  dietRestriction: z.enum(["no", "si"]).default("no"),
  dietDetail: z.string().optional(),
});

export const RSVPFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  email: z.string().email("Ingresa un email válido."),
  phone: z
    .string()
    .regex(/^[\+]?[0-9\s\-\(\)]{10,}$/, "Ingresa un teléfono válido."),
  dietRestriction: z.enum(["no", "si"]).default("no"),
  dietDetail: z.string().optional(),
  companions: z.array(CompanionSchema).optional(),
});

export default function RSVPForm({ event_id }: { event_id: string }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const deadline = new Date(2026, 5, 17); // June 17, 2026
  const currentDate = new Date();
  const isDeadlinePassed = false;

  const form = useForm({
    resolver: zodResolver(RSVPFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      dietRestriction: "no" as DietRestriction,
      dietDetail: "",
      companions: [] as {
        name: string;
        phone: string;
        dietRestriction: DietRestriction;
        dietDetail?: string;
      }[],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "companions",
  });

  const handleAddCompanion = () => {
    if (fields.length < MAX_COMPANIONS) {
      append({ name: "", phone: "", dietRestriction: "no", dietDetail: "" });
    }
  };

  const handleSubmit = async (data: z.infer<typeof RSVPFormSchema>) => {
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        dietRestriction: data.dietRestriction,
        dietDetail: data.dietDetail,
        companions: (data.companions ?? []).map((c) => ({
          name: c.name,
          phone: c.phone,
          dietRestriction: c.dietRestriction,
          dietDetail: c.dietDetail,
        })),
      };

      const res = await create_guests({ guests_info: payload, event_id });
      if (res.status === 200) {
        setSubmitted(true);
        const resemail = await sendAttendeeConfirmationEmail(res.data, event_id);
        console.log("🚀 ~ handleSubmit ~ resemail:", resemail)
        toast({
          title: "¡Gracias por confirmar!",
          description: `${fields.length + 1} ${fields.length === 0 ? "lugar" : "lugares"} confirmados. ${resemail}`,
        });
      } else {
        toast({
          title: "Error al confirmar",
          description: "Por favor, inténtelo de nuevo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Algo salió mal.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rsvp" ref={ref}>
      <div className="rsvp-head">
        <div className="rsvp-eyebrow">/02 — CONFIRMACIÓN</div>
        <h2 className={`rsvp-title ${inView ? "is-in" : ""}`}>
          <span>Confirmá tu</span>
          <span>asistencia</span>
        </h2>
        <div className="rsvp-deadline">
          <span className="rsvp-deadline-label">CONFIRMAR HASTA</span>
          <span className="rsvp-deadline-date">17 · 06 · 2026</span>
        </div>
      </div>

      {isDeadlinePassed ? (
        <div className="rsvp-deadline">
          <div className="rsvp-deadline-date">⏱</div>
          <p>
            Lamentamos informarle que el período de confirmación ha finalizado.
            Si desea realizar una confirmación tardía, le recomendamos
            contactarse directamente con los organizadores del evento.
          </p>
        </div>
      ) : submitted ? (
        <div className="rsvp-success">
          <div className="rsvp-success-num">{fields.length + 1}</div>
          <div className="rsvp-success-text">
            <div className="rsvp-success-eyebrow">
              GRACIAS, {form.getValues("name").toUpperCase()}
            </div>
            <h3>NOS VEMOS PRONTO.</h3>
            <p>
              Te confirmamos {fields.length + 1}{" "}
              {fields.length === 0 ? "lugar" : "lugares"} a tu nombre.
            </p>
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form
            className="rsvp-form"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            {/* ── Titular ── */}
            <div className="guest-card is-in">
              <div className="guest-card-head">
                <div className="guest-card-num">01</div>
                <div className="guest-card-label">INVITADX PRINCIPAL</div>
              </div>
              <div className="guest-card-body">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="field">
                      <label className="field-label">
                        Nombre y apellido <span className="req">*</span>
                      </label>
                      <FormControl>
                        <input
                          className="field-input"
                          placeholder="Ej. María García"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="field">
                      <label className="field-label">
                        Email <span className="req">*</span>
                      </label>
                      <FormControl>
                        <input
                          className="field-input"
                          type="email"
                          placeholder="Ej. maria@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="field">
                      <FormLabel className="field-label">
                        Celular <span className="req">*</span>
                      </FormLabel>
                      <FormControl>
                        <input
                          className="field-input"
                          type="tel"
                          placeholder="+54 9 ..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dietRestriction"
                  render={({ field }) => (
                    <FormItem className="field">
                      <label className="field-label">
                        ¿RESTRICCIÓN ALIMENTARIA?
                      </label>
                      <div className="seg">
                        {(["no", "si"] as const).map((opt) => (
                          <button
                            type="button"
                            key={opt}
                            className={`seg-btn ${field.value === opt ? "is-on" : ""}`}
                            onClick={() => field.onChange(opt)}
                          >
                            {opt === "no" ? "NO" : "SÍ"}
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch("dietRestriction") === "si" && (
                  <FormField
                    control={form.control}
                    name="dietDetail"
                    render={({ field }) => (
                      <FormItem className="field">
                        <label className="field-label">¿CUÁL?</label>
                        <FormControl>
                          <input
                            className="field-input"
                            placeholder="Vegetarianx, celíacx, alergias..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* ── Acompañantes ── */}
            {fields.map((field, index) => {
              return (
                <div key={field.id} className="guest-card is-in">
                  <div className="guest-card-head">
                    <div className="guest-card-num">
                      {String(index + 2).padStart(2, "0")}
                    </div>
                    <div className="guest-card-label">
                      ACOMPAÑANTE {index + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="guest-card-remove"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="guest-card-body">
                    <FormField
                      control={form.control}
                      name={`companions.${index}.name`}
                      render={({ field: f }) => (
                        <FormItem className="field">
                          <label className="field-label">
                            Nombre y apellido <span className="req">*</span>
                          </label>
                          <FormControl>
                            <input
                              className="field-input"
                              placeholder="Ej. Juan Pérez"
                              {...f}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`companions.${index}.phone`}
                      render={({ field: f }) => (
                        <FormItem className="field">
                          <FormLabel className="field-label">
                            Celular <span className="req">*</span>
                          </FormLabel>
                          <FormControl>
                            <input
                              className="field-input"
                              type="tel"
                              placeholder="+54 9 ..."
                              {...f}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`companions.${index}.dietRestriction`}
                      render={({ field: f }) => (
                        <FormItem className="field">
                          <label className="field-label">
                            ¿RESTRICCIÓN ALIMENTARIA?
                          </label>
                          <div className="seg">
                            {(["no", "si"] as const).map((opt) => (
                              <button
                                type="button"
                                key={opt}
                                className={`seg-btn ${f.value === opt ? "is-on" : ""}`}
                                onClick={() => f.onChange(opt)}
                              >
                                {opt === "no" ? "NO" : "SÍ"}
                              </button>
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />

                    {form.watch(`companions.${index}.dietRestriction`) ===
                      "si" && (
                      <FormField
                        control={form.control}
                        name={`companions.${index}.dietDetail`}
                        render={({ field: f }) => (
                          <FormItem className="field">
                            <label className="field-label">¿CUÁL?</label>
                            <FormControl>
                              <input
                                className="field-input"
                                placeholder="Vegetarianx, celíacx, alergias..."
                                {...f}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {/* ── Actions ── */}
            <div className="rsvp-actions">
              <button
                type="button"
                className="rsvp-add"
                onClick={handleAddCompanion}
                disabled={fields.length >= MAX_COMPANIONS}
              >
                <span className="rsvp-add-plus">＋</span>
                <span>
                  AGREGAR ACOMPAÑANTE <em>+{fields.length + 1}</em>
                </span>
              </button>
              <button type="submit" className="rsvp-submit" disabled={loading}>
                {loading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <span>CONFIRMAR ASISTENCIA</span>
                    <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                      <path
                        d="M0 7H20M20 7L14 1M20 7L14 13"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </Form>
      )}
    </section>
  );
}

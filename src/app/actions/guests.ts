"use server";

import { z } from "zod";
import { sendEmail } from "./sendEmail";
import { db } from "@/server/db";
import { get_event_complete } from "./events";
import { RSVPFormSchema } from "@/components/forms/confirm-asistance";

// ─── Guests ───────────────────────────────────────────────────────────────────

export async function create_guests({
  guests_info,
  event_id,
}: {
  guests_info: z.infer<typeof RSVPFormSchema>;
  event_id: string;
}) {
  try {
    if (!guests_info || !event_id) {
      return JSON.parse(
        JSON.stringify({ error: "Missing guests info or event ID", status: 400 })
      );
    }

    // ── Guest principal ───────────────────────────────────────────────────────
    const guestData = {
      eventId: event_id,
      name: guests_info.name ?? "",
      email: guests_info.email ?? "",
      phone: guests_info.phone || null,
      hasDietRestriction: guests_info.dietRestriction === "si",
      dietRestrictionComment: guests_info.dietRestriction === "si" ? guests_info.dietDetail || null : null,
      rsvp: true,
      isMainGuest: true,
      goesWith: null,
      comments: null,
    };

    // ── Acompañantes ──────────────────────────────────────────────────────────
    const companions = (guests_info.companions ?? []).map(c => {
      return {
        eventId: event_id,
        name: c.name,
        phone: c.phone,
        hasDietRestriction: c.dietRestriction === "si",
        dietRestrictionComment: c.dietRestriction === "si" ? c.dietDetail || null : null,
        rsvp: true,
        isMainGuest: false,
        goesWith: guests_info.name,
        comments: null,
      };
    });

    // ── Persistencia ──────────────────────────────────────────────────────────
    await db.guest.create({ data: guestData });

    if (companions.length > 0) {
      await db.guest.createMany({ data: companions });
    }

    // ── Payload para email ────────────────────────────────────────────────────
    const emailGuest: AttendeeData = {
      name: guestData.name,
      email: guestData.email,
      phone: guestData.phone ?? "",
      dietary_notes: guestData.dietRestrictionComment ?? "",
      company: companions.map(c => ({
        name: c.name,
        phone: c.phone ?? "",
        dietary_notes: c.dietRestrictionComment ?? "",
      })),
      rsvp: guestData.rsvp ?? true,
    };

    await sendOrganizerConfirmationEmail("julixv2706@gmail.com", emailGuest);

    return JSON.parse(
      JSON.stringify({
        data: emailGuest,
        message: "Guest created successfully",
        status: 200,
      })
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return JSON.parse(JSON.stringify({ error, status: 500 }));
  }
}

export async function delete_guest(id: string) {
  try {
    await db.guest.delete({ where: { id } });

    return JSON.parse(
      JSON.stringify({ message: "Invitado eliminado correctamente", status: 200 })
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return JSON.parse(JSON.stringify({ error, status: 500 }));
  }
}

// ─── Emails ───────────────────────────────────────────────────────────────────

interface AttendeeData {
  name: string;
  phone: string;
  email: string;
  dietary_notes: string;
  rsvp: boolean;
  company?: {
    name: string;
    phone: string;
    dietary_notes: string;
  }[];
}

export async function set_guest_active(id: string) {
  try {
      await db.guest.update({
          where: { id },
          data: { rsvp: true },
      });

      return { message: "Invitado desactivado correctamente", status: 200 };
  } catch (error) {
      console.error("Unexpected error:", error);
      return { error, status: 500 };
  }
}

export async function sendOrganizerConfirmationEmail(
  organizerEmail: string,
  attendee: AttendeeData
) {
  const hasCompany = (attendee.company ?? []).length > 0;
  const totalGuests = 1 + (attendee.company ?? []).length;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light" />
<title>Nueva Confirmación · Organizador</title>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;900&display=swap" rel="stylesheet" />
</head>

<body style="margin:0; padding:0; background-color:#150216; font-family: Georgia, serif; color:#f5fcff;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#150216;">
<tr>
<td align="center" style="padding:24px 12px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#150216; border:1px solid rgba(245,252,255,0.10);">

<!-- MAGENTA LINE TOP -->
<tr><td style="height:2px; background:linear-gradient(90deg, #e91c01, #bf60be);"></td></tr>

<!-- EYEBROW -->
<tr>
<td style="padding:24px 24px 0 24px;">
<div style="border-bottom:1px solid rgba(245,252,255,0.10); padding-bottom:16px; font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.22em; color:#bf60be; text-transform:uppercase;">
PANEL ORGANIZADOR &nbsp;·&nbsp; NUEVA CONFIRMACIÓN
</div>
</td>
</tr>

<!-- TITLE -->
<tr>
<td style="padding:24px 24px 0 24px;">
<div style="font-family:'Big Shoulders Display', Georgia, serif; font-weight:900; font-size:52px; line-height:0.88; letter-spacing:-0.02em; text-transform:uppercase; color:#f5fcff;">
NUEVA<br/>
<span style="color:#bf60be; font-style:italic;">CONFIRM<span style="color:#e91c01;">·</span></span>
</div>
</td>
</tr>

<!-- TOTAL BADGE -->
<tr>
<td style="padding:20px 24px 0 24px;">
<span style="display:inline-block; padding:7px 16px; background:rgba(233,28,1,0.12); border:1px solid rgba(233,28,1,0.35); font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.22em; color:#e91c01; text-transform:uppercase;">
${totalGuests} ${totalGuests === 1 ? 'ASISTENTE EN TOTAL' : 'ASISTENTES EN TOTAL'}
</span>
</td>
</tr>

<!-- DIVIDER -->
<tr>
<td style="padding:28px 24px;">
<table width="100%"><tr>
<td style="border-top:1px solid rgba(245,252,255,0.10);"></td>
<td style="width:12px; text-align:center; color:#bf60be; font-size:14px;">✦</td>
<td style="border-top:1px solid rgba(245,252,255,0.10);"></td>
</tr></table>
</td>
</tr>

<!-- MAIN GUEST BOX -->
<tr>
<td style="padding:0 24px 24px 24px;">
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(245,252,255,0.08); background:rgba(191,96,190,0.05);">

<tr>
<td style="padding:13px 18px; border-bottom:1px solid rgba(245,252,255,0.08); background:rgba(191,96,190,0.10); font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.22em; color:#bf60be; text-transform:uppercase;">
ASISTENTE PRINCIPAL
</td>
</tr>

<!-- NOMBRE -->
<tr>
<td style="padding:18px 18px 0 18px;">
<div style="font-family:'Courier New', monospace; font-size:9px; letter-spacing:0.24em; color:#bf60be; margin-bottom:6px; text-transform:uppercase;">NOMBRE</div>
<div style="font-family:'Big Shoulders Display', Georgia, serif; font-weight:900; font-size:28px; letter-spacing:0.02em; text-transform:uppercase; color:#f5fcff;">${attendee.name}</div>
</td>
</tr>

<tr><td style="padding:0 18px;"><div style="border-top:1px solid rgba(245,252,255,0.07); margin:14px 0;"></div></td></tr>

<!-- TELEFONO -->
<tr>
<td style="padding:0 18px;">
<div style="font-family:'Courier New', monospace; font-size:9px; letter-spacing:0.24em; color:#bf60be; margin-bottom:6px; text-transform:uppercase;">TELÉFONO</div>
<div style="font-size:16px; color:#f5fcff; letter-spacing:0.04em;">${attendee.phone || '—'}</div>
</td>
</tr>

<tr><td style="padding:0 18px;"><div style="border-top:1px solid rgba(245,252,255,0.07); margin:14px 0;"></div></td></tr>

<!-- DIETA -->
<tr>
<td style="padding:0 18px 18px 18px;">
<div style="font-family:'Courier New', monospace; font-size:9px; letter-spacing:0.24em; color:#bf60be; margin-bottom:6px; text-transform:uppercase;">RESTRICCIÓN ALIMENTARIA</div>
<div style="font-size:16px; color:${attendee.dietary_notes ? '#f5fcff' : 'rgba(245,252,255,0.35)'}; letter-spacing:0.02em;">
${attendee.dietary_notes || 'No'}
</div>
</td>
</tr>

</table>
</td>
</tr>

${hasCompany ? `
<!-- COMPANIONS BOX -->
<tr>
<td style="padding:0 24px 24px 24px;">
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(245,252,255,0.08); background:rgba(123,211,254,0.03);">

<tr>
<td style="padding:13px 18px; border-bottom:1px solid rgba(245,252,255,0.08); background:rgba(123,211,254,0.07); font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.22em; color:#7bd3fe; text-transform:uppercase;">
ACOMPAÑANTES &nbsp;·&nbsp; ${(attendee.company ?? []).length}
</td>
</tr>

${(attendee.company ?? []).map((c, i) => `
<tr>
<td style="padding:16px 18px; ${i > 0 ? 'border-top:1px solid rgba(245,252,255,0.06);' : ''}">
<table width="100%">
<tr>
<td>
<div style="font-family:'Courier New', monospace; font-size:9px; letter-spacing:0.24em; color:rgba(123,211,254,0.55); margin-bottom:5px; text-transform:uppercase;">
0${i + 1}
</div>
<div style="font-family:'Big Shoulders Display', Georgia, serif; font-weight:900; font-size:22px; letter-spacing:0.02em; text-transform:uppercase; color:#f5fcff;">${c.name}</div>
<div style="margin-top:5px; font-family:'Courier New', monospace; font-size:12px; letter-spacing:0.08em; color:rgba(245,252,255,0.5);">${c.phone}</div>
${c.dietary_notes ? `
<div style="margin-top:8px; display:inline-block; padding:3px 10px; background:rgba(233,28,1,0.12); border:1px solid rgba(233,28,1,0.28); font-family:'Courier New', monospace; font-size:9px; letter-spacing:0.18em; color:#e91c01; text-transform:uppercase;">
${c.dietary_notes}
</div>` : `
<div style="margin-top:5px; font-family:'Courier New', monospace; font-size:9px; letter-spacing:0.16em; color:rgba(245,252,255,0.25); text-transform:uppercase;">
SIN RESTRICCIÓN
</div>`}
</td>
</tr>
</table>
</td>
</tr>
`).join('')}

</table>
</td>
</tr>
` : ''}

<!-- FOOTER TEXT -->
<tr>
<td style="padding:0 24px 32px 24px; text-align:center;">
<p style="margin:0; font-family:'Courier New', monospace; font-size:11px; line-height:1.7; letter-spacing:0.12em; color:rgba(245,252,255,0.35); text-transform:uppercase;">
Notificación automática · Solo para uso interno
</p>
</td>
</tr>

<!-- MAGENTA LINE -->
<tr><td style="height:1px; background:linear-gradient(90deg, #e91c01, #bf60be);"></td></tr>

<!-- FINAL FOOTER -->
<tr>
<td style="padding:20px 24px; background:rgba(0,0,0,0.35);">
<table width="100%">
<tr>
<td style="font-family:'Big Shoulders Display', Georgia, serif; font-weight:900; font-size:28px; letter-spacing:-0.01em; text-transform:uppercase; color:#bf60be; font-style:italic;">
JULI<span style="color:#e91c01;">✦</span>XV
</td>
<td style="text-align:right; font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.22em; color:rgba(245,252,255,0.4); text-transform:uppercase;">27 · 06 · 2026</td>
</tr>
<tr>
<td colspan="2" style="padding-top:12px; border-top:1px solid rgba(245,252,255,0.07);">
<p style="margin:0; font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.14em; color:rgba(245,252,255,0.4); line-height:1.6; text-transform:uppercase;">
Panel de gestión de invitados · Solo para uso interno
</p>
</td>
</tr>
</table>
</td>
</tr>

</table>
</td>
</tr>
</table>

</body>
</html>`;

  await sendEmail({
    to: organizerEmail,
    subject: `Nueva confirmación — ${attendee.name}${hasCompany ? ` +${(attendee.company ?? []).length}` : ''}`,
    html,
  });
}

export async function sendAttendeeConfirmationEmail(
  attendeeData: AttendeeData,
  event_id: string
) {
  const res = await get_event_complete(event_id);
  const eventData = res.event;

  if (!eventData) return 'No se envió el mail';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light" />
<title>Confirmación de Asistencia · Juli XV</title>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;900&display=swap" rel="stylesheet" />
</head>

<body style="margin:0; padding:0; background-color:#150216; font-family: Georgia, serif; color:#f5fcff;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#150216;">
<tr>
<td align="center" style="padding:24px 12px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#150216; border:1px solid rgba(245,252,255,0.10);">

<!-- GRADIENT LINE TOP -->
<tr><td style="height:2px; background:linear-gradient(90deg, #e91c01, #bf60be, #7bd3fe);"></td></tr>

<!-- EYEBROW -->
<tr>
<td style="padding:24px 24px 0 24px;">
<div style="border-bottom:1px solid rgba(245,252,255,0.10); padding-bottom:16px; font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.22em; color:#bf60be; text-transform:uppercase;">
CONFIRMACIÓN &nbsp;·&nbsp; ASISTENCIA
</div>
</td>
</tr>

<!-- TITLE -->
<tr>
<td style="padding:24px 24px 0 24px;">
<div style="font-family:'Big Shoulders Display', Georgia, serif; font-weight:900; font-size:52px; line-height:0.88; letter-spacing:-0.02em; text-transform:uppercase; color:#f5fcff;">
NOS VEMOS<br/>
<span style="color:#7bd3fe; font-style:italic;">PRONTO<span style="color:#bf60be;">✦</span></span>
</div>
</td>
</tr>

<!-- GREETING -->
<tr>
<td style="padding:24px 24px 0 24px;">
<p style="margin:0; font-size:17px; line-height:1.65; color:rgba(245,252,255,0.80);">
Hola <strong style="color:#f5fcff; font-family:'Big Shoulders Display', Georgia, serif; font-size:20px; letter-spacing:0.04em; text-transform:uppercase;">${attendeeData.name}</strong>,<br/>
tu asistencia ha sido confirmada exitosamente.
</p>
</td>
</tr>

<!-- DIVIDER -->
<tr>
<td style="padding:28px 24px;">
<table width="100%"><tr>
<td style="border-top:1px solid rgba(245,252,255,0.10);"></td>
<td style="width:12px; text-align:center; color:#bf60be; font-size:14px;">✦</td>
<td style="border-top:1px solid rgba(245,252,255,0.10);"></td>
</tr></table>
</td>
</tr>

<!-- EVENT BOX -->
<tr>
<td style="padding:0 24px 24px 24px;">

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(245,252,255,0.08); background:rgba(191,96,190,0.04);">

<tr>
<td style="padding:13px 18px; border-bottom:1px solid rgba(245,252,255,0.08); background:rgba(191,96,190,0.09); font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.22em; color:#bf60be; text-transform:uppercase;">
DETALLES DEL EVENTO
</td>
</tr>

<!-- CUANDO -->
<tr>
<td style="padding:20px 18px;">
<div style="font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.22em; color:#bf60be; margin-bottom:8px; text-transform:uppercase;">CUÁNDO</div>
<div style="font-family:'Big Shoulders Display', Georgia, serif; font-weight:900; font-size:26px; letter-spacing:0.02em; text-transform:uppercase; color:#f5fcff;">SÁBADO 27 · JUNIO · 2026</div>
<div style="margin-top:4px; font-family:'Courier New', monospace; font-size:13px; letter-spacing:0.16em; color:rgba(245,252,255,0.6);">20:00 HS</div>
</td>
</tr>

<tr><td style="border-top:1px solid rgba(245,252,255,0.07);"></td></tr>

<!-- DONDE -->
<tr>
<td style="padding:20px 18px;">
<div style="font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.22em; color:#bf60be; margin-bottom:8px; text-transform:uppercase;">DÓNDE</div>
<div style="font-family:'Big Shoulders Display', Georgia, serif; font-weight:900; font-size:26px; letter-spacing:0.02em; text-transform:uppercase; color:#f5fcff;">SUMMUM</div>
<div style="margin-top:4px; font-family:'Courier New', monospace; font-size:13px; letter-spacing:0.10em; color:rgba(245,252,255,0.55); line-height:1.6;">
Avellaneda 163<br/>Las Varillas, Córdoba
</div>
<a href="https://share.google/3UekuZ5N6jOy9VCz4"
style="display:inline-block; margin-top:12px; font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.20em; color:#7bd3fe; text-decoration:none; text-transform:uppercase; border-bottom:1px solid rgba(123,211,254,0.35); padding-bottom:2px;">
VER EN MAPA →
</a>
</td>
</tr>

<tr><td style="border-top:1px solid rgba(245,252,255,0.07);"></td></tr>



${(attendeeData.company ?? []).length > 0 ? `
<tr><td style="border-top:1px solid rgba(245,252,255,0.07);"></td></tr>
<tr>
<td style="padding:20px 18px;">
<div style="font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.22em; color:#7bd3fe; margin-bottom:14px; text-transform:uppercase;">ASISTÍS CON</div>
<table width="100%" cellpadding="0" cellspacing="0">
${(attendeeData.company ?? []).map((c, i) => `
<tr>
  <td style="padding:10px 0; ${i > 0 ? 'border-top:1px solid rgba(245,252,255,0.06);' : ''}">
    <div style="font-family:'Big Shoulders Display', Georgia, serif; font-weight:900; font-size:20px; letter-spacing:0.02em; text-transform:uppercase; color:#f5fcff;">${c.name}</div>
    ${c.dietary_notes && c.dietary_notes !== 'Sin restricción' ? `
    <div style="margin-top:5px; display:inline-block; padding:2px 10px; background:rgba(233,28,1,0.10); border:1px solid rgba(233,28,1,0.25); font-family:'Courier New', monospace; font-size:9px; letter-spacing:0.18em; color:#e91c01; text-transform:uppercase;">
      ${c.dietary_notes}
    </div>` : ''}
  </td>
</tr>
`).join('')}
</table>
</td>
</tr>
` : ''}

</table>

</td>
</tr>

<!-- FOOTER TEXT -->
<tr>
<td style="padding:0 24px 32px 24px; text-align:center;">
<p style="margin:0; font-size:16px; line-height:1.65; color:rgba(245,252,255,0.65);">
Si tenés alguna consulta, contactá al organizador.<br/>
<span style="font-family:'Big Shoulders Display', Georgia, serif; font-weight:900; font-size:20px; letter-spacing:0.06em; text-transform:uppercase; color:#bf60be;">¡TE ESPERAMOS!</span>
</p>
</td>
</tr>

<!-- GRADIENT LINE -->
<tr><td style="height:1px; background:linear-gradient(90deg, #e91c01, #bf60be, #7bd3fe);"></td></tr>

<!-- FINAL FOOTER -->
<tr>
<td style="padding:20px 24px; background:rgba(0,0,0,0.35);">

<table width="100%">


<tr>
<td colspan="2" style="padding-top:12px; border-top:1px solid rgba(245,252,255,0.07);">
<p style="margin:0; font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.14em; color:rgba(245,252,255,0.40); line-height:1.6; text-transform:uppercase;">
Este email confirma tu asistencia al evento. Guardalo para referencia.
</p>
</td>
</tr>
</table>

</td>
</tr>

</table>
</td>
</tr>
</table>

</body>
</html>`;

  await sendEmail({
    to: attendeeData.email,
    subject: `Confirmación de asistencia — ${eventData.name}`,
    html,
  });

  return 'Email enviado';
}
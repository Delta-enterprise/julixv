import React from "react";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Shield,
  ExternalLink,
} from "lucide-react";

import Link from "next/link";
import GuestList from "@/components/admin/list";
import { logoutEvent, getEventJwtData } from "../actions/event-auth";
import { EventWithRelations, get_event_complete } from "../actions/events";

// Logout component
const LogoutButton = () => {
  const handleLogout = async () => {
    "use server";
    await logoutEvent();
    redirect("/login");
  };

  return (
    <form action={handleLogout}>
      <Button variant="outline" size="sm">
        <LogOut className="h-4 w-4 mr-2" />
        Cerrar Sesión
      </Button>
    </form>
  );
};

// Retry button needs to be a client component to use window
const RetryButton = () => {
  "use client";
  return (
    <Button variant="outline" onClick={() => window.location.reload()}>
      Reintentar
    </Button>
  );
};

const EventDetailsPage = async ( ) => {
  // Get JWT data — contains the eventId the admin authenticated for
  const authData = await getEventJwtData();

  if (!authData) {
    redirect("/login");
  }

  // Ensure the slug in the URL matches the event the JWT was issued for,
  // so admins can't browse to another event's dashboard by changing the URL.
  if ("Juli XV" !== authData.eventName) {
    redirect("/login");
  }

  // Fetch event using the trusted eventId from the JWT, not the URL param
  const res = await get_event_complete(authData.eventId);

  if (res.status !== 200 || !res.event) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold text-red-800">
                Error al cargar el evento
              </h2>
              <p className="text-red-600">
                {res.status === 404
                  ? `El evento "${authData.eventName}" no fue encontrado.`
                  : res.error || "Ha ocurrido un error inesperado"}
              </p>
              <div className="flex justify-center space-x-4">
                <LogoutButton />
                {/* Reload needs client interactivity — extract to a client component */}
                <Link href={`/dashboard/${authData.eventName}`}>
                  <Button variant="outline">Reintentar</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const event = res.event;
  const { admin, guests, messages } = event as EventWithRelations;

  console.log(messages);

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Authentication Header */}
      <div className="flex justify-between items-center bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            Autenticado como: {authData.email}
          </span>
        </div>
        <LogoutButton />
      </div>

      {/* Event Header */}
      <div className="space-y-2">
        <Link
          target="_blank"
          href={`/`}
          className="text-4xl flex gap-2 items-center font-bold text-gray-900 hover:underline"
        >
          {event.name}
          <ExternalLink className="h-4 w-4 ml-1" />
        </Link>
      </div>

      {/* Guest List */}
      <Card>
        <GuestList messagesProps={messages} guestsProps={guests} />
      </Card>
    </div>
  );
};

export default EventDetailsPage;
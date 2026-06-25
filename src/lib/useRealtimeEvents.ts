"use client";

import { useEffect } from "react";

const realtimeEventsUrl =
  process.env.NEXT_PUBLIC_REALTIME_EVENTS_URL || "/api-backend/events";

export type RealtimeEventName =
  | "link-clicked"
  | "link-converted"
  | "chatmix-webhook";

const defaultEvents: RealtimeEventName[] = [
  "link-clicked",
  "link-converted",
];

type RealtimeConnectionStatus = "connecting" | "connected" | "error";

export function useRealtimeEvents(
  onEvent: (event: MessageEvent<string>) => void,
  events: RealtimeEventName[] = defaultEvents,
  onConnectionChange?: (status: RealtimeConnectionStatus) => void
) {
  useEffect(() => {
    if (typeof window === "undefined" || !window.EventSource) {
      onConnectionChange?.("error");
      return;
    }

    onConnectionChange?.("connecting");
    const source = new EventSource(realtimeEventsUrl);
    const handleConnected = () => onConnectionChange?.("connected");
    const handleError = () => onConnectionChange?.("error");

    source.addEventListener("connected", handleConnected);
    source.onerror = handleError;
    events.forEach((eventName) => {
      source.addEventListener(eventName, onEvent);
    });

    return () => {
      source.removeEventListener("connected", handleConnected);
      events.forEach((eventName) => {
        source.removeEventListener(eventName, onEvent);
      });
      source.close();
    };
  }, [events, onConnectionChange, onEvent]);
}

"use client";

import { useEffect } from "react";

const realtimeEventsUrl =
  process.env.NEXT_PUBLIC_REALTIME_EVENTS_URL || "/api-backend/events";

type RealtimeEventName = "link-clicked" | "link-converted";

const defaultEvents: RealtimeEventName[] = [
  "link-clicked",
  "link-converted",
];

export function useRealtimeEvents(
  onEvent: () => void,
  events: RealtimeEventName[] = defaultEvents
) {
  useEffect(() => {
    if (typeof window === "undefined" || !window.EventSource) {
      return;
    }

    const source = new EventSource(realtimeEventsUrl);

    events.forEach((eventName) => {
      source.addEventListener(eventName, onEvent);
    });

    return () => {
      events.forEach((eventName) => {
        source.removeEventListener(eventName, onEvent);
      });
      source.close();
    };
  }, [events, onEvent]);
}

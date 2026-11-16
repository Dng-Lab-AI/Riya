"use client";

import { useEffect } from "react";

// Tells the server that this tutor's profile was viewed (counted once per visitor and day).
export function ProfileViewTracker({ tutorId }: { tutorId: string }) {
  useEffect(() => {
    fetch(`/api/tuteurs/${tutorId}/vue`, { method: "POST", keepalive: true }).catch(() => {});
  }, [tutorId]);
  return null;
}

"use client";

import { useReducer, useSyncExternalStore } from "react";
import { Bell, BellRing } from "lucide-react";

const subscribe = () => () => {};

// Lets the member turn on browser notifications for new messages. The permission prompt
// only opens on a click (browsers require it), so this is a button, not an automatic ask.
export function EnableNotifications() {
  // Rendered only after mounting, so the server and client first paint agree.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  if (!mounted || typeof Notification === "undefined") return null;
  const permission = Notification.permission;
  if (permission === "granted") return null;

  const ask = async () => {
    try {
      await Notification.requestPermission();
    } catch {
      // Older browsers use a callback form; nothing to do if it fails.
    }
    rerender();
  };

  return (
    <button type="button" onClick={ask} className="btn-outline mb-4 text-sm" disabled={permission === "denied"}>
      {permission === "denied" ? <BellRing size={16} /> : <Bell size={16} />}
      {permission === "denied"
        ? "Notifications bloquées (à réautoriser dans votre navigateur)"
        : "Être prévenu des nouveaux messages"}
    </button>
  );
}

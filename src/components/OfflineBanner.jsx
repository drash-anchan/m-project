import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-16 inset-x-0 z-30 flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-full bg-yellow-500/90 text-black text-xs sm:text-sm font-medium px-4 py-2 shadow-nav">
        <i className="fa-solid fa-triangle-exclamation" />
        No connection — showing offline maps and last-synced data. Live
        updates paused.
      </div>
    </div>
  );
}

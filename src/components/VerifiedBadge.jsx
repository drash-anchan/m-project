export default function VerifiedBadge({ status, sourceUrl, sourceName }) {
  const isVerified = status === "verified";

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
          isVerified
            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
            : "bg-amber-500/15 text-amber-300 border border-amber-400/30"
        }`}
      >
        <i
          className={`fa-solid ${isVerified ? "fa-circle-check" : "fa-triangle-exclamation"}`}
        />
        {isVerified ? "Verified — live feed" : "Unverified — community-submitted"}
      </span>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-white/50 hover:text-white/80 underline underline-offset-2"
        >
          {sourceName || "source"}
        </a>
      )}
    </div>
  );
}

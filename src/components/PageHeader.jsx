export default function PageHeader({ eyebrow, title, subhead }) {
  return (
    <div className="mb-8 animate-headlineFade">
      {eyebrow && (
        <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-3xl sm:text-4xl mb-2">{title}</h1>
      {subhead && <p className="text-white/70 max-w-2xl">{subhead}</p>}
    </div>
  );
}

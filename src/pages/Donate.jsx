import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import { getLedger, addEntry, verifyChain, summarize } from "../lib/ledger";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function Donate() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [chainStatus, setChainStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    getLedger().then(setEntries);
  }, []);

  async function handleDonate(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    const entry = await addEntry({
      type: "donation",
      donor: name || "Anonymous",
      amountINR: Number(amount),
      note: note || "General relief fund",
    });
    setEntries((prev) => [...prev, entry]);
    setAmount("");
    setName("");
    setNote("");
  }

  async function handleVerify() {
    setChecking(true);
    const result = await verifyChain();
    setChainStatus(result);
    setChecking(false);
  }

  const { totalDonated, totalDisbursed, balance } = summarize(entries);

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("page.donate.eyebrow")}
        title={t("page.donate.title")}
        subhead={t("page.donate.subhead")}
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-xs text-muted">Total donated</div>
          <div className="font-display text-2xl mt-1">
            ₹{totalDonated.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-xs text-muted">Total disbursed</div>
          <div className="font-display text-2xl mt-1">
            ₹{totalDisbursed.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-xs text-muted">Current balance</div>
          <div className="font-display text-2xl mt-1">
            ₹{balance.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="font-display text-xl mb-4">Make a donation</h2>
          <form
            onSubmit={handleDonate}
            className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4"
          >
            <div>
              <label className="block text-xs text-muted mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Your name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Earmark (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Kerala flood relief"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-white/40"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-white text-black font-medium px-6 py-2.5 shadow-ctaglow hover:shadow-ctaglowhover transition-shadow"
            >
              Add to ledger (demo)
            </button>
            <p className="text-xs text-white/40">
              To accept real money, wire this form to a payment processor
              (Razorpay/UPI works well for India) and write the confirmed
              transaction to the ledger from your backend, not the browser.
            </p>
          </form>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">Public ledger</h2>
            <button
              onClick={handleVerify}
              disabled={checking}
              className="text-xs rounded-full bg-white/10 border border-white/20 px-3 py-1.5 hover:bg-white/15"
            >
              {checking ? "Checking…" : "Verify chain integrity"}
            </button>
          </div>

          {chainStatus && (
            <p
              className={`text-sm mb-3 ${
                chainStatus.valid ? "text-emerald-300" : "text-red-300"
              }`}
            >
              <i
                className={`fa-solid ${
                  chainStatus.valid ? "fa-circle-check" : "fa-triangle-exclamation"
                } mr-1`}
              />
              {chainStatus.valid
                ? "Chain intact — no entries have been altered."
                : `Tampering detected at entry #${chainStatus.brokenAtIndex + 1}.`}
            </p>
          )}

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {[...entries].reverse().map((e, i) => (
              <div
                key={e.hash}
                className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={
                      e.type === "donation" ? "text-emerald-300" : "text-sky-300"
                    }
                  >
                    {e.type === "donation" ? "+ Donation" : "− Disbursement"}
                  </span>
                  <span>₹{e.amountINR.toLocaleString("en-IN")}</span>
                </div>
                <div className="text-white/60 text-xs mt-1">
                  {e.type === "donation" ? e.donor : e.to} · {e.note}
                </div>
                <div className="text-white/30 text-[10px] mt-1 font-mono truncate">
                  hash: {e.hash.slice(0, 24)}…
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

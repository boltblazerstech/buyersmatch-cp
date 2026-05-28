import React from "react";
import { Clock, Check, X, ShieldX, AlertTriangle, Home, ThumbsUp, Send, Handshake, FileText, Briefcase, PenTool, Search, DollarSign, Unlock, Eye, Key } from "lucide-react";

// ─── Stage definitions ───────────────────────────────────────────────────────
// optional: true  → shown with dashed border when skipped (PPI Done, BNP Done)
export const DEAL_STAGES = [
  { key: "assigned",             label: "Property\nAssigned",              optional: false, Icon: Home,       color: "#3b82f6", glow: "rgba(59,130,246,0.4)" },
  { key: "accepted",             label: "Property\nAccepted",              optional: false, Icon: ThumbsUp,   color: "#6366f1", glow: "rgba(99,102,241,0.4)" },
  { key: "offer_submitted",      label: "Offer\nSubmitted",                optional: false, Icon: Send,       color: "#8b5cf6", glow: "rgba(139,92,246,0.4)" },
  { key: "offer_accepted",       label: "Offer\nAccepted",                 optional: false, Icon: Handshake,  color: "#d946ef", glow: "rgba(217,70,239,0.4)" },
  { key: "contract_received",    label: "Contract\nReceived",              optional: false, Icon: FileText,   color: "#ec4899", glow: "rgba(236,72,153,0.4)" },
  { key: "conveyancer_approved", label: "Conveyancer\nApproved",           optional: false, Icon: Briefcase,  color: "#f43f5e", glow: "rgba(244,63,94,0.4)" },
  { key: "contract_signed",      label: "Contract\nSigned",                optional: false, Icon: PenTool,    color: "#f97316", glow: "rgba(249,115,22,0.4)" },
  { key: "bnp_done",             label: "BNP\nDone",                       optional: true,  Icon: Search,     color: "#f59e0b", glow: "rgba(245,158,11,0.4)" },
  { key: "finance_done",         label: "Finance\nDone",                   optional: false, Icon: DollarSign, color: "#10b981", glow: "rgba(16,185,129,0.4)" },
  { key: "unconditional",        label: "Contract\nUnconditional",         optional: false, Icon: Unlock,     color: "#14b8a6", glow: "rgba(20,184,166,0.4)" },
  { key: "psi_done",             label: "PSI\nDone",                       optional: false, Icon: Eye,        color: "#06b6d4", glow: "rgba(6,182,212,0.4)" },
  { key: "settlement_done",      label: "Settlement\nDone",                optional: false, Icon: Key,        color: "#fbbf24", glow: "rgba(251,191,36,0.4)" },
];

// ─── Status analyser ─────────────────────────────────────────────────────────
// Zoho naming mismatches handled here:
//   "Offer Accepted" / "Offer Accepted1" → Offer Accepted    (display stage 4, idx=3)
//   "Contract Received"                  → Contract Received (display stage 5, idx=4)
//   "Conveyencer Approved"               → Conveyancer Approved (display stage 6, idx=5) [Zoho typo]
//   "Tenanted" / "Social Media Completed" / "Done" → Settlement Done (last visible stage, idx=11)
export const analyzeStatus = (assignment) => {
  if (!assignment) return { isTerminal: false, currentIdx: 0 };

  const zs  = (assignment.zohoStatus || "").trim();
  const zsL = zs.toLowerCase();
  const ps  = (assignment.portalStatus || "").toUpperCase();

  // ── Terminal checks ──
  if (ps === "REJECTED" || /property.{0,15}reject/i.test(zsL))
    return { isTerminal: true, terminalLabel: "Property Rejected", terminalType: "rejected" };

  if (/offer.{0,20}(withdrawn|withdraw|reject)/i.test(zsL))
    return { isTerminal: true, terminalLabel: "Offer Withdrawn", terminalType: "withdrawn" };

  // ── Normal stage detection (most-advanced → least-advanced) ──
  let currentIdx = 0;

  // Tenanted / Social Media / Done all collapse to Settlement Done (last visible stage)
  if      (/\bdone\b/.test(zsL) && !/bnp|finance|settle|ppi|psi/i.test(zsL))   currentIdx = 11;
  else if (/social.?media/i.test(zsL))                                  currentIdx = 11;
  else if (/tenant/i.test(zsL))                                         currentIdx = 11;
  else if (/settle/i.test(zsL))                                         currentIdx = 11;
  else if (/\bpsi\b/i.test(zsL))                                        currentIdx = 10;
  else if (/unconditional/i.test(zsL))                                  currentIdx = 9;
  else if (/finance/i.test(zsL))                                        currentIdx = 8;
  else if (/\bbnp\b/i.test(zsL))                                        currentIdx = 7;
  else if (/contract.{0,5}sign/i.test(zsL) || /\bppi\s*done\b/i.test(zsL)) currentIdx = 6;
  // Zoho typo "Conveyencer" handled via flexible regex, also treat PPI Completed as this stage
  else if (/convey[ae]nc[ae]r?.{0,10}approv/i.test(zsL) || /\bppi\s*completed\b/i.test(zsL)) currentIdx = 5;
  // "Contract Received" → Contract Received stage
  else if (/contract.{0,5}receiv/i.test(zsL))                          currentIdx = 4;
  // "Offer Accepted" / "Offer Accepted1" → Offer Accepted stage
  else if (/offer.{0,5}accept/i.test(zsL))                             currentIdx = 3;
  else if (/offer.{0,10}submit/i.test(zsL))                            currentIdx = 2;
  else if (ps === "ACCEPTED" || /property.{0,15}accept/i.test(zsL))    currentIdx = 1;
  else                                                                   currentIdx = 0;

  return { isTerminal: false, currentIdx };
};

// ─── Terminal status banner ───────────────────────────────────────────────────
const TerminalBanner = ({ label, type }) => {
  const isRejected = type === "rejected";
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-8 mb-8 flex items-center gap-6"
      style={{
        background: isRejected
          ? 'linear-gradient(135deg, rgba(127,29,29,0.25), rgba(153,27,27,0.1), rgba(127,29,29,0.2))'
          : 'linear-gradient(135deg, rgba(120,53,15,0.25), rgba(146,64,14,0.1), rgba(120,53,15,0.2))',
        border: isRejected ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(245,158,11,0.25)',
        boxShadow: isRejected
          ? '0 4px 40px rgba(239,68,68,0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
          : '0 4px 40px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-30"
        style={{ background: isRejected ? '#ef4444' : '#f59e0b' }}
      />
      <div
        className="relative shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: isRejected ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
          border: isRejected ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(245,158,11,0.3)',
        }}
      >
        {isRejected
          ? <ShieldX size={30} className="text-red-400" />
          : <AlertTriangle size={30} className="text-amber-400" />
        }
      </div>
      <div className="flex-1 relative">
        <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${
          isRejected ? "text-red-500" : "text-amber-500"
        }`}>Deal Stopped</p>
        <p className={`text-xl font-bold ${
          isRejected ? "text-red-300" : "text-amber-300"
        }`}>{label}</p>
        <p className="text-sm text-gray-500 mt-1">
          {isRejected
            ? "This property has been rejected and the deal is no longer active."
            : "The offer has been withdrawn and the deal is no longer active."
          }
        </p>
      </div>
      <span
        className="shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest"
        style={{
          background: isRejected ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
          border: isRejected ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(245,158,11,0.3)',
          color: isRejected ? '#f87171' : '#fbbf24',
        }}
      >
        {isRejected ? 'Rejected' : 'Withdrawn'}
      </span>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const DealProgress = ({ assignment }) => {
  const { isTerminal, terminalLabel, terminalType, currentIdx } =
    analyzeStatus(assignment);

  // Terminal → show banner only, no progress track
  if (isTerminal) {
    return <TerminalBanner label={terminalLabel} type={terminalType} />;
  }

  // Build per-stage state
  // optional stages that are "between" already-completed stages are shown as "skipped"
  const stageStates = DEAL_STAGES.map((stage, idx) => {
    if (idx < currentIdx) {
      if (stage.optional) {
        if (stage.key === "bnp_done") return "complete";
        return "skipped";
      }
      return "complete";
    }
    if (idx === currentIdx) return "active";
    return "pending";
  });

  // Split into rows: [0-3], [4-7], [8-11] (4 items per row)
  const rows = [
    DEAL_STAGES.slice(0, 4).map((s, i) => ({ ...s, idx: i, state: stageStates[i] })),
    DEAL_STAGES.slice(4, 8).map((s, i) => ({ ...s, idx: i + 4, state: stageStates[i + 4] })),
    DEAL_STAGES.slice(8, 12).map((s, i) => ({ ...s, idx: i + 8, state: stageStates[i + 8] })),
  ];

  const isDone = currentIdx === 11;

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-8 mb-8"
      style={{
        background: 'linear-gradient(145deg, #0c1d38 0%, #0e2248 50%, #091628 100%)',
        boxShadow: '0 0 0 1px rgba(42,191,191,0.13), 0 12px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Ambient glow orbs */}
      <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(42,191,191,0.07) 0%, transparent 70%)' }} />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(42,191,191,0.04) 0%, transparent 70%)' }} />
      {isDone && (
        <div className="absolute inset-0 pointer-events-none animate-[pulse_3s_ease-in-out_infinite]"
             style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(42,191,191,0.06) 0%, transparent 60%)' }} />
      )}

      <style>{`
        @keyframes dp-pulse {
          0%   { transform: scale(1);   opacity: 0.65; }
          100% { transform: scale(2.1); opacity: 0; }
        }
        @keyframes stage-progress {
          0%   { left: 0%;   opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes person-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        .dp-ring { position: absolute; border-radius: 9999px; animation: dp-pulse 2.4s ease-out infinite; }
        .dp-ring-2 { animation-delay: 0.6s !important; }
        .animate-stage-progress {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          animation: stage-progress 3.5s linear infinite;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .animate-person-bounce {
          animation: person-bounce 0.6s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="relative flex items-center justify-between mb-10">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="text-teal" size={20} /> Deal Progress
        </h3>
        {isDone && (
          <span className="px-3 py-1 bg-teal/15 border border-teal/30 text-teal text-xs font-bold rounded-full uppercase tracking-widest">
            ✓ Completed
          </span>
        )}
      </div>

      <div className="relative space-y-12">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-start">
            {row.map((item, cellIdx) => {
              const itemWidthClass = "flex-1";
              const { state, optional, label, idx, Icon, color: currColor, glow: currGlow } = item;
              const isFirst = cellIdx === 0;
              const isLast  = cellIdx === row.length - 1;
              const prevState = row[cellIdx - 1]?.state;

              const isComplete = state === "complete";
              const isActive   = state === "active";

              const leftFill  = !isFirst && (prevState === "complete" || prevState === "active");
              const rightFill = !isLast  && (isComplete || isActive);

              const prevColor = idx > 0 ? DEAL_STAGES[idx - 1].color : 'transparent';
              const nextColor = idx < 11 ? DEAL_STAGES[idx + 1].color : 'transparent';

              const dotSize = isActive ? '48px' : isComplete ? '42px' : '36px';

              const labelClass =
                isComplete ? "text-[rgba(42,191,191,0.8)] font-medium" :
                isActive   ? "text-white font-bold" :
                "text-gray-500";

              const showRunner = isActive && !isLast;

              return (
                <div
                  key={idx}
                  className="min-w-0 flex flex-col items-center flex-1"
                >
                  <div className="flex items-center w-full relative h-14">
                    {/* Left connector */}
                    <div className={`flex-1 relative ${isFirst ? 'invisible' : ''}`} style={{ height: '3px' }}>
                      <div
                        className="absolute inset-0 rounded-full transition-all duration-700"
                        style={leftFill
                          ? { background: `linear-gradient(90deg, ${prevColor}, ${currColor})`, boxShadow: `0 0 10px ${currGlow}`, opacity: 0.9 }
                          : { background: 'rgba(255,255,255,0.08)' }
                        }
                      />
                    </div>

                    {/* Dot wrapper with badge */}
                    <div className="relative shrink-0 flex items-center justify-center z-10 mx-2">
                      {isActive && (
                        <>
                          <div
                            className="dp-ring pointer-events-none"
                            style={{ width: '58px', height: '58px', left: '50%', top: '50%', marginLeft: '-29px', marginTop: '-29px', border: `1.5px solid ${currColor}`, opacity: 0.6 }}
                          />
                          <div
                            className="dp-ring dp-ring-2 pointer-events-none"
                            style={{ width: '74px', height: '74px', left: '50%', top: '50%', marginLeft: '-37px', marginTop: '-37px', border: `1px solid ${currColor}`, opacity: 0.3 }}
                          />
                        </>
                      )}

                      {/* Number Badge */}
                      <div
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center z-20 shadow-lg"
                        style={{
                          background: (isComplete || isActive) ? currColor : '#1e293b',
                          border: '2px solid #0c1d38',
                          color: (isComplete || isActive) ? '#fff' : 'rgba(255,255,255,0.7)',
                          fontSize: '9px',
                          fontWeight: '800'
                        }}
                      >
                        {idx + 1}
                      </div>

                      <div
                        className="flex items-center justify-center rounded-full transition-all duration-500 relative z-10"
                        style={{
                          width: dotSize,
                          height: dotSize,
                          background: (isComplete || isActive)
                            ? `linear-gradient(135deg, ${currColor} 0%, #0a172e 200%)`
                            : 'rgba(255,255,255,0.04)',
                          border: (isComplete || isActive) ? `2px solid ${currColor}` : '2px solid rgba(255,255,255,0.1)',
                          boxShadow: isActive
                            ? `0 0 0 1px ${currColor}, 0 0 20px ${currGlow}, 0 0 45px ${currGlow}`
                            : isComplete
                              ? `0 0 12px ${currGlow}`
                              : 'none',
                        }}
                      >
                        <Icon size={isActive ? 22 : 18} style={{ color: (isComplete || isActive) ? '#fff' : 'rgba(156,163,175,0.5)' }} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                    </div>

                    {/* Right connector */}
                    <div className={`flex-1 relative ${isLast ? 'invisible' : ''}`} style={{ height: '3px' }}>
                      <div
                        className="absolute inset-0 rounded-full transition-all duration-700"
                        style={rightFill
                          ? { background: `linear-gradient(90deg, ${currColor}, ${nextColor})`, boxShadow: `0 0 10px ${currGlow}`, opacity: 0.9 }
                          : { background: 'rgba(255,255,255,0.08)' }
                        }
                      />
                      {showRunner && (
                        <div className="animate-stage-progress z-20">
                          <img
                            src="/character.png"
                            className="w-10 h-10 object-contain animate-person-bounce"
                            alt="Progress"
                          />
                          <div className="w-4 h-1 bg-black/40 rounded-full blur-[2px] -mt-1" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Label */}
                  <div className="text-center mt-4 px-1 space-y-1">
                    {label.split("\n").map((line, li) => (
                      <p key={li} className={`text-[11px] leading-tight ${labelClass}`}>
                        {line}
                      </p>
                    ))}
                    {isActive && (
                      <span className="inline-block px-1.5 py-0.5 mt-1 bg-teal/10 border border-teal/30 text-teal text-[8px] font-bold rounded-full uppercase tracking-widest">
                        {isDone ? "Completed" : "Current"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DealProgress;

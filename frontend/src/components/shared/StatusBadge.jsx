import React from "react";
import { analyzeStatus } from "./DealProgress";

// Purchased = has reached Contract Unconditional (idx 10) or beyond
// Uses the same analyzeStatus from DealProgress for consistency
export const isPurchasedItem = (item) => {
  // Explicit portal override
  if (item.portalStatus === "PURCHASED") return true;
  const { isTerminal, currentIdx } = analyzeStatus(item.assignment);
  if (isTerminal) return false;
  return currentIdx >= 9; // 9 = Contract Unconditional (was 10)
};

// Terminal: Property Rejected or Offer Withdrawn
export const isRejectedItem = (item) => {
  if (item.portalStatus === "REJECTED") return true;
  const { isTerminal, terminalType } = analyzeStatus(item.assignment);
  return isTerminal && terminalType === "rejected";
};

export const isWithdrawnItem = (item) => {
  const { isTerminal, terminalType } = analyzeStatus(item.assignment);
  return isTerminal && terminalType === "withdrawn";
};

// Either rejected or withdrawn — used for the REJECTED scorecard/tab
export const isTerminalItem = (item) => isRejectedItem(item) || isWithdrawnItem(item);

export const getStatusConfig = (item) => {
  const zohoLabel = item.assignment?.zohoStatus;
  const portalStatus = item.portalStatus;

  if (isPurchasedItem(item)) {
    return { cls: "bg-gold text-navy", label: zohoLabel || "Purchased" };
  }

  // Terminal statuses
  const { isTerminal, terminalType } = analyzeStatus(item.assignment);
  if (isTerminal) {
    if (terminalType === "rejected" || portalStatus === "REJECTED") {
      return { cls: "bg-red-500/20 text-red-300 border border-red-500/30", label: zohoLabel || "Rejected" };
    }
    if (terminalType === "withdrawn") {
      return { cls: "bg-amber-500/20 text-amber-300 border border-amber-500/30", label: "Offer Withdrawn" };
    }
  }

  switch (portalStatus) {
    case "ACCEPTED":
      return { cls: "bg-teal text-navy", label: zohoLabel || "Accepted" };
    case "REJECTED":
      return { cls: "bg-red-500/20 text-red-300 border border-red-500/30", label: zohoLabel || "Rejected" };
    case "PENDING":
      return {
        cls: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
        label: zohoLabel || "Assigned",
      };
    default:
      return {
        cls: "bg-gray-500/20 text-gray-400",
        label: zohoLabel || portalStatus || "—",
      };
  }
};

const StatusBadge = ({ item }) => {
  const { cls, label } = getStatusConfig(item);
  return (
    <span className={`inline-block whitespace-nowrap px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
};

export default StatusBadge;

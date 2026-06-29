import React from "react";
import { Bed, Bath, Car, Check, Lock, Users, ShoppingBag, Trash2, Loader2 } from "lucide-react";
import StatusBadge, { isPurchasedItem } from "./StatusBadge";

const PropertyTable = ({
  properties,
  onRowClick,
  selectable = false,
  compareList = [],
  onToggleCompare,
  onDeleteAssignment,
  deletingId,
  confirmDeleteId,
  onCancelDelete,
}) => {
  const showDelete = !!onDeleteAssignment;

  return (
    <div className="bg-navy border border-teal/20 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-teal/20">
              {selectable && <th className="px-6 py-4 w-12" />}
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Property</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Specs</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Land Size</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Price Range</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Rental Yield</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Rental Situation</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Status</th>
              {showDelete && <th className="px-4 py-4 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {properties.map((item) => {
              const assignmentId = item.assignment?.id;
              const isComparing = compareList.find(p => p.id === assignmentId);
              const isOffMarket = /off.?market/i.test(item.property.saleType || "");
              const isDualOcc = item.property.pool === true;
              const rentalYield = item.assignment?.rentalYield ?? item.property.yieldPercent;
              const isDeleting = deletingId === assignmentId;
              const isConfirming = confirmDeleteId === assignmentId;

              return (
                <tr
                  key={assignmentId}
                  onClick={() => { if (!isConfirming) onRowClick(item); }}
                  className={`cursor-pointer hover:bg-teal/5 transition-colors group ${isComparing ? "bg-teal/5" : ""}`}
                >
                  {selectable && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleCompare(item)}
                        className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${isComparing ? "bg-teal border-teal text-navy" : "border-white/20 text-transparent group-hover:text-gray-500"}`}
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-bold text-sm">{item.property.addressLine1}</p>
                      <p className="text-teal text-xs mt-0.5">
                        {[item.property.suburb, item.property.state].filter(Boolean).join(", ")}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {isPurchasedItem(item) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gold/20 border border-gold/40 text-gold text-[8px] font-bold rounded-full tracking-widest shrink-0">
                            <ShoppingBag size={8} /> PURCHASED
                          </span>
                        )}
                        {isOffMarket && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[8px] font-bold rounded tracking-widest shrink-0">
                            <Lock size={8} /> OFF MARKET
                          </span>
                        )}
                        {isDualOcc && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[8px] font-bold rounded tracking-widest shrink-0">
                            <Users size={8} /> DUAL OCCUPANCY
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Bed size={12} /> {item.property.bedrooms}</span>
                      <span className="flex items-center gap-1"><Bath size={12} /> {item.property.bathrooms}</span>
                      <span className="flex items-center gap-1"><Car size={12} /> {item.property.carParking}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-300">
                      {item.property.areaSqm != null ? `${item.property.areaSqm} m²` : "—"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gold font-bold text-sm">
                      ${item.property.askingPriceMin / 1000}k – ${item.property.askingPriceMax / 1000}k
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-teal font-bold text-sm">
                      {rentalYield != null ? `${rentalYield}%` : "—"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-300">
                      {item.property.rentalSituation || "—"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <StatusBadge item={item} />
                  </td>
                  {showDelete && (
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      {isDeleting ? (
                        <Loader2 size={16} className="animate-spin text-red-400" />
                      ) : isConfirming ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onDeleteAssignment(assignmentId)}
                            className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600 transition-all"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={onCancelDelete}
                            className="px-2 py-1 bg-white/10 text-gray-300 text-[10px] font-bold rounded-lg hover:bg-white/20 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onDeleteAssignment(assignmentId)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          title="Remove this assignment"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PropertyTable;

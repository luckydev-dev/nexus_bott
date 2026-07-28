// nexus bot
import React from 'react';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FloatingSaveBarProps {
  isDirty: boolean;
  onSave: () => void;
  onReset?: () => void;
  onDiscard?: () => void;
  isSaving?: boolean;
}

export const FloatingSaveBar: React.FC<FloatingSaveBarProps> = ({
  isDirty,
  onSave,
  onReset,
  onDiscard,
  isSaving = false
}) => {
  const handleDiscard = onDiscard || onReset;
  return (
    <AnimatePresence>
      {isDirty && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-xl bg-[#0f1015]/95 backdrop-blur-xl border border-[#5865F2]/40 rounded-2xl p-3.5 shadow-2xl shadow-indigo-950/50 flex items-center justify-between gap-4 text-xs font-sans"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block leading-tight font-display">Unsaved Configuration Changes</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {handleDiscard && (
              <button
                type="button"
                onClick={handleDiscard}
                className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition text-xs border border-white/5 cursor-pointer"
              >
                Discard
              </button>
            )}

            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold transition text-xs shadow-lg shadow-[#5865F2]/20 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

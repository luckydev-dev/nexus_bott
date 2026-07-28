// nexus bot
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DropdownOption {
  value: string | number;
  label: string;
}

interface CustomDropdownProps {
  id?: string;
  value: string | number;
  onChange: (value: any) => void;
  options: DropdownOption[];
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  id,
  value,
  onChange,
  options,
  className = '',
  buttonClassName = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue: string | number) => {
    if (disabled) return;
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div id={id} ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-2 bg-[#0c0c0e] border border-white/5 rounded text-slate-200 hover:border-[#5865F2]/50 text-xs font-medium w-full focus:outline-none transition-all duration-150 text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${buttonClassName}`}
      >
        <span className="truncate">{selectedOption?.label || ''}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute left-0 right-0 mt-1.5 bg-[#111214] border border-[#202225] rounded shadow-2xl z-50 overflow-hidden py-1 max-h-60 overflow-y-auto"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors duration-150 ${
                    isSelected 
                      ? 'bg-[#5865F2] text-white font-semibold' 
                      : 'text-slate-300 hover:bg-[#35363c] hover:text-white'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1.5 text-white" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface MultiSelectDropdownProps {
  id?: string;
  selectedValues: (string | number)[];
  onChange: (values: any[]) => void;
  options: DropdownOption[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  id,
  selectedValues = [],
  onChange,
  options,
  className = '',
  placeholder = 'Select options...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleOption = (optionValue: string | number) => {
    if (disabled) return;
    const isSelected = selectedValues.includes(optionValue);
    let nextValues: any[];
    if (isSelected) {
      nextValues = selectedValues.filter((v) => v !== optionValue);
    } else {
      nextValues = [...selectedValues, optionValue];
    }
    onChange(nextValues);
  };

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLabels = options
    .filter((opt) => selectedValues.includes(opt.value))
    .map((opt) => opt.label);

  const displayText = selectedLabels.length > 0 
    ? selectedLabels.join(', ') 
    : placeholder;

  return (
    <div id={id} ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-2 bg-[#0c0c0e] border border-white/5 rounded text-slate-200 hover:border-[#5865F2]/50 text-xs font-medium w-full focus:outline-none transition-all duration-150 text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="truncate flex-1 text-slate-300">{displayText}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute left-0 right-0 mt-1.5 bg-[#111214] border border-[#202225] rounded shadow-2xl z-50 overflow-hidden py-1 max-h-60 flex flex-col"
          >
            <div className="px-2 py-1.5 border-b border-white/5">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full bg-[#0c0c0e] border border-white/5 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-[#5865F2]"
              />
            </div>
            <div className="overflow-y-auto flex-1 max-h-44 py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500 text-center font-sans">No options found</div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleToggleOption(option.value)}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors duration-150 ${
                        isSelected 
                          ? 'bg-[#5865F2]/20 text-white font-semibold' 
                          : 'text-slate-300 hover:bg-[#35363c] hover:text-white'
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1.5 text-[#5865F2]" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

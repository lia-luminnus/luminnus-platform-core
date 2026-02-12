import React, { useState, useRef, useEffect } from 'react';

interface Option {
    label: string;
    value: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: (string | Option)[];
    placeholder?: string;
    variant?: 'glass' | 'solid' | 'minimal';
    label?: string;
    className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    variant = 'glass',
    label,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const normalizedOptions = options.map(opt =>
        typeof opt === 'string' ? { label: opt, value: opt } : opt
    );

    const selectedOption = normalizedOptions.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [containerRef]);

    // Base container styles
    const containerStyles = "relative w-full min-w-[180px]";

    // Variant-specific styles for the trigger button
    const getTriggerStyles = () => {
        const base = "flex items-center justify-between w-full cursor-pointer transition-all duration-200 outline-none";

        switch (variant) {
            case 'glass':
                return `${base} px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-primary/50 dark:hover:border-brand-primary/50 text-gray-700 dark:text-gray-200 shadow-sm backdrop-blur-sm`;
            case 'solid':
                return `${base} px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-[#1f2937] border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white`;
            case 'minimal':
                return `${base} py-2 border-b border-gray-200 dark:border-gray-700 hover:border-brand-primary text-gray-700 dark:text-gray-300 rounded-none px-0`;
            default:
                return base;
        }
    };

    // Variant-specific styles for the dropdown menu
    const getDropdownStyles = () => {
        const base = "absolute z-[100] w-full mt-2 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right";

        switch (variant) {
            case 'glass':
                return `${base} bg-white/90 dark:bg-[#1a1f2e]/95 backdrop-blur-xl border border-gray-100 dark:border-white/10 shadow-xl rounded-xl ring-1 ring-black/5`;
            case 'solid':
                return `${base} bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg rounded-lg`;
            case 'minimal':
                return `${base} bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-lg rounded-lg`;
            default:
                return base;
        }
    };

    return (
        <div className={`${containerStyles} ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1">
                    {label}
                </label>
            )}

            {/* Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    ${getTriggerStyles()} 
                    ${isOpen ? 'ring-2 ring-brand-primary/20 border-brand-primary dark:border-brand-primary' : ''}
                `}
            >
                <span className={`block truncate ${!selectedOption ? 'text-gray-400' : ''} text-sm`}>
                    {selectedOption?.label || placeholder}
                </span>
                <span className={`material-symbols-outlined text-gray-400 text-[20px] transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-primary' : ''}`}>
                    expand_more
                </span>
            </div>

            {/* Dropdown Options */}
            {isOpen && (
                <div className={getDropdownStyles()}>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {normalizedOptions.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`
                                    flex items-center justify-between px-3 py-2 text-sm cursor-pointer rounded-lg transition-colors mb-0.5
                                    ${option.value === value
                                        ? 'bg-brand-primary/10 text-brand-primary font-medium'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}
                                `}
                            >
                                <span>{option.label}</span>
                                {option.value === value && (
                                    <span className="material-symbols-outlined text-brand-primary text-[18px]">check</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;

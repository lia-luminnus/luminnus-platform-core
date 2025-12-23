
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

// --- Types ---

interface CellData {
  value: string;
  formula: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    align?: 'left' | 'center' | 'right';
    color?: string;
    bg?: string;
  };
}

interface SheetData {
  [key: string]: CellData; // Key: "row-col"
}

interface Sheet {
  id: string;
  name: string;
  data: SheetData;
}

export interface SpreadsheetHandle {
  addSheet: () => void;
}

interface Coords {
  r: number;
  c: number;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ROWS = 50;
const COLS = 26;

// --- Helpers ---

const getColLabel = (index: number) => {
  let label = '';
  let i = index;
  while (i >= 0) {
    label = ALPHABET[i % 26] + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
};

const getCellKey = (r: number, c: number) => `${r}-${c}`;

const evaluateFormula = (formula: string, data: SheetData): string => {
  if (!formula.startsWith('=')) return formula;
  const expression = formula.substring(1).toUpperCase();
  // Basic replacement for cell references like A1, B2
  const parsedExpression = expression.replace(/([A-Z]+)([0-9]+)/g, (match, colStr, rowStr) => {
    let colIndex = 0;
    for (let i = 0; i < colStr.length; i++) {
      colIndex = colIndex * 26 + (colStr.charCodeAt(i) - 64);
    }
    colIndex -= 1;
    const rowIndex = parseInt(rowStr) - 1;
    const cellKey = getCellKey(rowIndex, colIndex);
    const cellValue = data[cellKey]?.value || '0';
    return isNaN(Number(cellValue)) ? '0' : cellValue;
  });

  try {
    // eslint-disable-next-line no-eval
    return String(eval(parsedExpression));
  } catch (e) {
    return '#ERROR';
  }
};

export const Spreadsheet = forwardRef<SpreadsheetHandle, {}>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  
  // --- State ---
  
  const [sheets, setSheets] = useState<Sheet[]>([{ id: '1', name: 'Planilha 1', data: {} }]);
  const [activeSheetId, setActiveSheetId] = useState<string>('1');
  
  // Selection State
  const [selectionStart, setSelectionStart] = useState<Coords | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Coords | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Editing State
  const [editingCell, setEditingCell] = useState<Coords | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState('');

  // History State
  const [history, setHistory] = useState<Sheet[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Chart State
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];
  const data = activeSheet.data;

  // Initialize History
  useEffect(() => {
    if (history.length === 0) {
        const initial = JSON.parse(JSON.stringify(sheets));
        setHistory([initial]);
        setHistoryIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync Formula Bar with Selection
  useEffect(() => {
    if (selectionStart && !editingCell) {
      const key = getCellKey(selectionStart.r, selectionStart.c);
      setFormulaBarValue(data[key]?.formula || data[key]?.value || '');
    } else if (!selectionStart) {
      setFormulaBarValue('');
    }
  }, [selectionStart, editingCell, activeSheetId, data]);

  // --- Actions ---

  const updateSheets = (newSheets: Sheet[], addToHistory = true) => {
    setSheets(newSheets);
    if (addToHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newSheets)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const deleteSheet = (sheetId: string) => {
    if (sheets.length <= 1) {
        toast.error('Você deve ter pelo menos uma planilha.');
        return;
    }
    const newSheets = sheets.filter(s => s.id !== sheetId);
    setSheets(newSheets);
    setActiveSheetId(newSheets[0].id);
  };

  const updateCell = (r: number, c: number, value: string) => {
    const key = getCellKey(r, c);
    const prevData = { ...data };
    const computedValue = value.startsWith('=') ? evaluateFormula(value, prevData) : value;

    const newData = {
      ...prevData,
      [key]: {
        ...prevData[key],
        formula: value,
        value: computedValue
      }
    };

    const newSheets = sheets.map(sheet => 
      sheet.id === activeSheetId ? { ...sheet, data: newData } : sheet
    );
    updateSheets(newSheets);
  };

  // --- Selection Logic ---

  const handleMouseDown = (r: number, c: number, e: React.MouseEvent) => {
    // If clicking on the currently editing cell, do nothing (let input handle focus)
    if (editingCell?.r === r && editingCell?.c === c) return;

    // Commit previous edit if exists
    if (editingCell) {
        setEditingCell(null);
    }

    setSelectionStart({ r, c });
    setSelectionEnd({ r, c });
    setIsDragging(true);
    
    // Focus container to capture keyboard events
    containerRef.current?.focus();
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (isDragging) {
      setSelectionEnd({ r, c });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- Keyboard Handling (Global / Container) ---

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If currently editing, let the Input handle keys (except Enter/Tab which might verify)
    if (editingCell) {
        if (e.key === 'Enter') {
             e.preventDefault();
             e.stopPropagation();
             setEditingCell(null);
             // Move down
             if (selectionStart && selectionStart.r < ROWS - 1) {
                 const nextR = selectionStart.r + 1;
                 setSelectionStart({ r: nextR, c: selectionStart.c });
                 setSelectionEnd({ r: nextR, c: selectionStart.c });
             }
             containerRef.current?.focus();
        }
        return;
    }

    if (!selectionStart) return;

    const { r, c } = selectionStart;

    // Navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        let nextR = r;
        let nextC = c;

        if (e.key === 'ArrowUp') nextR = Math.max(0, r - 1);
        if (e.key === 'ArrowDown') nextR = Math.min(ROWS - 1, r + 1);
        if (e.key === 'ArrowLeft') nextC = Math.max(0, c - 1);
        if (e.key === 'ArrowRight') nextC = Math.min(COLS - 1, c + 1);

        setSelectionStart({ r: nextR, c: nextC });
        if (!e.shiftKey) {
            setSelectionEnd({ r: nextR, c: nextC });
        } else {
             setSelectionEnd({ r: nextR, c: nextC }); 
        }
        return;
    }

    if (e.key === 'Tab') {
        e.preventDefault();
        const nextC = Math.min(COLS - 1, c + 1);
        setSelectionStart({ r, c: nextC });
        setSelectionEnd({ r, c: nextC });
        return;
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        const nextR = Math.min(ROWS - 1, r + 1);
        setSelectionStart({ r: nextR, c });
        setSelectionEnd({ r: nextR, c });
        return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        // Clear Range
        if (selectionStart && selectionEnd) {
            const minR = Math.min(selectionStart.r, selectionEnd.r);
            const maxR = Math.max(selectionStart.r, selectionEnd.r);
            const minC = Math.min(selectionStart.c, selectionEnd.c);
            const maxC = Math.max(selectionStart.c, selectionEnd.c);

            const newSheets = sheets.map(sheet => {
                if (sheet.id === activeSheetId) {
                    const newData = { ...sheet.data };
                    for (let i = minR; i <= maxR; i++) {
                        for (let j = minC; j <= maxC; j++) {
                             const key = getCellKey(i, j);
                             if (newData[key]) {
                                 newData[key] = { ...newData[key], value: '', formula: '' };
                             }
                        }
                    }
                    return { ...sheet, data: newData };
                }
                return sheet;
            });
            updateSheets(newSheets);
        }
        return;
    }

    // Start Editing
    const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    
    if (e.key === 'F2' || isPrintable) {
        if (isPrintable) {
            // FIX: Prevent double typing by stopping browser default insertion
            e.preventDefault();
        }
        setEditingCell({ r, c });
        
        // If it's a character, overwrite content. If F2, keep content.
        if (isPrintable) {
            updateCell(r, c, e.key);
            setFormulaBarValue(e.key);
        }
    }
  };

  // --- Rendering Helpers ---

  const isCellSelected = (r: number, c: number) => {
    if (!selectionStart || !selectionEnd) return false;
    const minR = Math.min(selectionStart.r, selectionEnd.r);
    const maxR = Math.max(selectionStart.r, selectionEnd.r);
    const minC = Math.min(selectionStart.c, selectionEnd.c);
    const maxC = Math.max(selectionStart.c, selectionEnd.c);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const isCellActive = (r: number, c: number) => {
      return selectionStart?.r === r && selectionStart?.c === c;
  }

  // --- Toolbar Handlers ---

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSheets(JSON.parse(JSON.stringify(history[historyIndex - 1])));
      toast.success('Desfazer');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSheets(JSON.parse(JSON.stringify(history[historyIndex + 1])));
      toast.success('Refazer');
    }
  };

  const handleStyle = (styleKey: string, value: any) => {
      if(!selectionStart || !selectionEnd) return;
      
      const minR = Math.min(selectionStart.r, selectionEnd.r);
      const maxR = Math.max(selectionStart.r, selectionEnd.r);
      const minC = Math.min(selectionStart.c, selectionEnd.c);
      const maxC = Math.max(selectionStart.c, selectionEnd.c);

      const prevData = { ...data };
      
      for(let r = minR; r <= maxR; r++) {
          for(let c = minC; c <= maxC; c++) {
              const key = getCellKey(r, c);
              const currentStyle = prevData[key]?.style || {};
              // Toggle if boolean and already active
              const newValue = (typeof value === 'boolean' && currentStyle[styleKey as keyof typeof currentStyle] === value) ? undefined : value;
              const newStyle = { ...currentStyle, [styleKey]: newValue };
              prevData[key] = { ...prevData[key] || { value: '', formula: '' }, style: newStyle };
          }
      }

      const newSheets = sheets.map(s => s.id === activeSheetId ? { ...s, data: prevData } : s);
      updateSheets(newSheets);
  };

  const insertFormula = (prefix: string) => {
      if (!selectionStart) return;
      const { r, c } = selectionStart;
      updateCell(r, c, prefix);
      setFormulaBarValue(prefix);
      setEditingCell({ r, c });
  };

  const generateChart = () => {
    if (!selectionStart || !selectionEnd) {
        toast.error('Selecione dados para criar um gráfico');
        return;
    }

    const minR = Math.min(selectionStart.r, selectionEnd.r);
    const maxR = Math.max(selectionStart.r, selectionEnd.r);
    const minC = Math.min(selectionStart.c, selectionEnd.c);
    const maxC = Math.max(selectionStart.c, selectionEnd.c);

    const generatedData = [];

    // Try to determine structure.
    // If multiple columns: assume Col 1 is Label, Col 2 is Value.
    // If single column: Use Row Number as Label.
    
    for(let r = minR; r <= maxR; r++) {
        let label = `R${r+1}`;
        let value = 0;

        if (minC !== maxC) {
            // Multi column selection
            const labelKey = getCellKey(r, minC);
            const valueKey = getCellKey(r, minC + 1); // Use next column as value
            
            label = data[labelKey]?.value || `Item ${r - minR + 1}`;
            value = parseFloat(data[valueKey]?.value || '0');
        } else {
            // Single column
            const key = getCellKey(r, minC);
            value = parseFloat(data[key]?.value || '0');
        }
        
        if (!isNaN(value)) {
            generatedData.push({ name: label, value });
        }
    }

    if (generatedData.length === 0) {
        toast.error('Nenhum dado numérico válido encontrado na seleção.');
        return;
    }

    setChartData(generatedData);
    setShowChart(true);
  };

  // --- Sheets ---
  useImperativeHandle(ref, () => ({
    addSheet: () => {
      const newId = Date.now().toString();
      const newSheet: Sheet = { id: newId, name: `Planilha ${sheets.length + 1}`, data: {} };
      updateSheets([...sheets, newSheet]);
      setActiveSheetId(newId);
    }
  }));

  return (
    <div 
        className="flex flex-col h-full bg-white dark:bg-[#1a1f2e] text-gray-800 dark:text-gray-200 font-sans text-sm border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm outline-none"
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseUp={handleMouseUp}
    >
      
      {/* 1. Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 overflow-x-auto select-none no-scrollbar">
        {/* File / Print */}
        <div className="flex gap-1 pr-3 border-r border-gray-300 dark:border-white/10">
            <button onClick={() => toast.success('Salvo')} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-brand-primary" title="Salvar"><span className="material-symbols-outlined text-lg">save</span></button>
            <button onClick={() => window.print()} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10" title="Imprimir"><span className="material-symbols-outlined text-lg">print</span></button>
        </div>
        
        {/* History */}
        <div className="flex gap-1 px-3 border-r border-gray-300 dark:border-white/10">
            <button onClick={undo} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10" title="Desfazer"><span className="material-symbols-outlined text-lg">undo</span></button>
            <button onClick={redo} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10" title="Refazer"><span className="material-symbols-outlined text-lg">redo</span></button>
        </div>
        
        {/* Formatting */}
        <div className="flex gap-1 px-3 border-r border-gray-300 dark:border-white/10 font-serif">
             <button onClick={() => handleStyle('bold', true)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 font-bold" title="Negrito">B</button>
             <button onClick={() => handleStyle('italic', true)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 italic" title="Itálico">I</button>
             <button onClick={() => handleStyle('underline', true)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 underline" title="Sublinhado">U</button>
             <div className="relative">
                 <input 
                    type="color" 
                    ref={colorInputRef} 
                    className="absolute opacity-0 w-0 h-0"
                    onChange={(e) => handleStyle('color', e.target.value)}
                 />
                 <button onClick={() => colorInputRef.current?.click()} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 font-sans border-b-2 border-brand-primary font-bold px-2 flex items-center justify-center h-full" title="Cor do Texto">
                     <span className="material-symbols-outlined text-lg">format_color_text</span>
                 </button>
             </div>
        </div>

        {/* Alignment */}
        <div className="flex gap-1 px-3 border-r border-gray-300 dark:border-white/10">
            <button onClick={() => handleStyle('align', 'left')} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10"><span className="material-symbols-outlined text-lg">format_align_left</span></button>
            <button onClick={() => handleStyle('align', 'center')} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10"><span className="material-symbols-outlined text-lg">format_align_center</span></button>
            <button onClick={() => handleStyle('align', 'right')} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10"><span className="material-symbols-outlined text-lg">format_align_right</span></button>
        </div>

        {/* Tools */}
        <div className="flex gap-1 px-3 text-brand-primary">
             <button onClick={() => insertFormula('=SUM(')} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 font-bold flex items-center" title="Inserir Soma">
                <span className="material-symbols-outlined text-lg">functions</span>
             </button>
             <button onClick={generateChart} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10" title="Criar Gráfico">
                <span className="material-symbols-outlined text-lg">bar_chart</span>
             </button>
        </div>
      </div>

      {/* 2. Formula Bar */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1f2e]">
         <div className="w-10 text-center font-bold text-gray-500 text-xs bg-gray-100 dark:bg-white/5 py-1 rounded">
            {selectionStart ? `${getColLabel(selectionStart.c)}${selectionStart.r + 1}` : ''}
         </div>
         <span className="text-gray-400 font-serif italic">fx</span>
         <input 
            type="text" 
            className="flex-1 bg-transparent border-none focus:outline-none text-sm font-mono"
            value={formulaBarValue}
            onChange={(e) => {
                setFormulaBarValue(e.target.value);
                if(selectionStart) updateCell(selectionStart.r, selectionStart.c, e.target.value);
            }}
            placeholder="Selecione uma célula para editar..."
         />
      </div>

      {/* 3. Grid */}
      <div className="flex-1 overflow-auto relative select-none">
         <div className="inline-block min-w-full">
            {/* Header Row */}
            <div className="flex sticky top-0 z-10">
                <div className="w-10 h-8 bg-gray-100 dark:bg-[#111827] border-r border-b border-gray-300 dark:border-white/10 flex-shrink-0 sticky left-0 z-20"></div>
                {Array.from({ length: COLS }).map((_, i) => (
                    <div key={i} className="w-24 h-8 bg-gray-100 dark:bg-[#111827] border-r border-b border-gray-300 dark:border-white/10 flex items-center justify-center font-bold text-gray-500 text-xs flex-shrink-0">
                        {getColLabel(i)}
                    </div>
                ))}
            </div>

            {/* Rows */}
            {Array.from({ length: ROWS }).map((_, r) => (
                <div key={r} className="flex">
                    {/* Row Num */}
                    <div className="w-10 h-8 bg-gray-100 dark:bg-[#111827] border-r border-b border-gray-300 dark:border-white/10 flex items-center justify-center font-bold text-gray-500 text-xs flex-shrink-0 sticky left-0 z-10">
                        {r + 1}
                    </div>
                    {/* Cells */}
                    {Array.from({ length: COLS }).map((_, c) => {
                        const cellKey = getCellKey(r, c);
                        const cellData = data[cellKey];
                        const selected = isCellSelected(r, c);
                        const active = isCellActive(r, c);
                        const isEditing = editingCell?.r === r && editingCell?.c === c;

                        return (
                            <div 
                                key={c}
                                onMouseDown={(e) => handleMouseDown(r, c, e)}
                                onMouseEnter={() => handleMouseEnter(r, c)}
                                onDoubleClick={() => setEditingCell({r, c})}
                                className={`w-24 h-8 border-r border-b border-gray-200 dark:border-white/5 flex-shrink-0 relative text-xs
                                    ${selected ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-[#1a1f2e]'}
                                    ${active ? 'ring-2 ring-brand-primary z-10 bg-transparent' : ''}
                                `}
                                style={{
                                    fontWeight: cellData?.style?.bold ? 'bold' : 'normal',
                                    fontStyle: cellData?.style?.italic ? 'italic' : 'normal',
                                    textDecoration: cellData?.style?.underline ? 'underline' : 'none',
                                    textAlign: cellData?.style?.align || 'left',
                                    color: cellData?.style?.color,
                                    backgroundColor: selected ? undefined : cellData?.style?.bg // Selection overrides bg for visibility
                                }}
                            >
                                {isEditing ? (
                                    <input 
                                        autoFocus
                                        className="w-full h-full border-none outline-none bg-white dark:bg-black px-1 absolute inset-0 z-20"
                                        value={formulaBarValue}
                                        onChange={(e) => {
                                            setFormulaBarValue(e.target.value);
                                            updateCell(r, c, e.target.value);
                                        }}
                                        onBlur={() => setEditingCell(null)}
                                    />
                                ) : (
                                    <div className="w-full h-full px-1 py-1.5 overflow-hidden whitespace-nowrap text-ellipsis pointer-events-none">
                                        {cellData?.value}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
         </div>
      </div>

      {/* 4. Footer Tabs */}
      <div className="h-10 bg-gray-100 dark:bg-[#0c0f17] border-t border-gray-200 dark:border-white/10 flex items-center px-2 gap-2 overflow-x-auto">
         {sheets.map(sheet => (
             <div key={sheet.id} className={`group relative flex items-center rounded-t-lg border-t-2 ${activeSheetId === sheet.id ? 'bg-white dark:bg-[#1a1f2e] border-brand-primary' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                <button 
                    onClick={() => setActiveSheetId(sheet.id)}
                    className="px-4 py-1.5 text-xs font-medium"
                >
                    {sheet.name}
                </button>
                {/* Delete Button (Only if active and more than 1 sheet) */}
                {activeSheetId === sheet.id && sheets.length > 1 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); deleteSheet(sheet.id); }}
                        className="pr-2 pl-1 text-gray-400 hover:text-red-500"
                        title="Excluir Planilha"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                )}
             </div>
         ))}
         <button onClick={() => {
             const newId = Date.now().toString();
             updateSheets([...sheets, { id: newId, name: `Planilha ${sheets.length + 1}`, data: {} }]);
             setActiveSheetId(newId);
         }} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded ml-1" title="Adicionar Planilha"><span className="material-symbols-outlined text-sm">add</span></button>
      </div>

      {/* Chart Modal */}
      {showChart && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
              <div className="glass-panel bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-3xl p-6 shadow-2xl relative flex flex-col h-[500px]">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold">Visualização de Gráfico</h3>
                      <button onClick={() => setShowChart(false)} className="text-gray-400 hover:text-brand-primary">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                              <XAxis dataKey="name" tick={{fill: '#9CA3AF'}} />
                              <YAxis tick={{fill: '#9CA3AF'}} />
                              <RechartsTooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#fff' }} />
                              <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
});

Spreadsheet.displayName = 'Spreadsheet';

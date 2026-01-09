
import React, { useEffect, useRef } from 'react';
import { VisualEvent, VisualChartPayload, VisualImagePayload, VisualTextPayload, VisualVideoPayload } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

interface VisualOutputProps {
  events: VisualEvent[];
  isLoading?: boolean;
}

const VisualOutput: React.FC<VisualOutputProps> = ({ events, isLoading = false }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events, isLoading]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const renderChart = (payload: VisualChartPayload) => {
    const ChartComponent = payload.chartType === 'line' ? LineChart : (payload.chartType === 'area' ? AreaChart : BarChart);
    const DataComponent = payload.chartType === 'line' ? Line : (payload.chartType === 'area' ? Area : Bar);
    const color = '#39ff14';

    return (
      <div className="w-full h-64 mt-2 bg-black/50 p-2 rounded border border-gray-800">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={payload.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" stroke="#888" fontSize={10} tick={{fill: '#888'}} />
            <YAxis stroke="#888" fontSize={10} tick={{fill: '#888'}} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111', borderColor: '#39ff14', color: '#fff' }} 
              itemStyle={{ color: '#39ff14' }}
              cursor={{fill: 'rgba(57, 255, 20, 0.1)'}}
            />
            {/* @ts-ignore */}
            <DataComponent type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.3} />
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-neon-panel/50 border border-neon-blue/20 rounded-lg h-full backdrop-blur-sm relative scrollbar-thin scrollbar-thumb-neon-blue/20">
      {events.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 font-mono pointer-events-none">
          <div className="animate-pulse text-sm tracking-widest">AWAITING DATA STREAM...</div>
        </div>
      )}
      
      {events.map((event) => {
        const isUser = event.role === 'user';
        return (
          <div key={event.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col max-w-[90%] sm:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
              
              <div className={`
                relative p-4 rounded-2xl shadow-lg border backdrop-blur-md transition-all
                ${isUser 
                  ? 'bg-neon-purple/10 border-neon-purple/40 text-gray-100 rounded-br-none' 
                  : 'bg-gray-900/80 border-neon-green/30 text-gray-200 rounded-bl-none'}
              `}>
                
                {/* Event Type Header */}
                {!isUser && event.type !== 'text' && (
                  <div className="text-xs font-mono text-neon-green mb-2 uppercase tracking-wider flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse"></span>
                     {event.type} OUTPUT
                  </div>
                )}

                {/* --- CONTENT RENDERERS --- */}
                
                {/* 1. TEXT */}
                {event.type === 'text' && (
                  <p className="text-base leading-relaxed whitespace-pre-wrap font-sans">
                    {(event.content as VisualTextPayload).text}
                  </p>
                )}

                {/* 2. IMAGE (Standard or High Res) */}
                {event.type === 'image' && (
                  <div>
                     <h3 className="text-white text-sm font-bold mb-2">{(event.content as VisualImagePayload).title}</h3>
                     <div className="rounded-lg overflow-hidden border border-gray-700 shadow-lg relative group">
                        <img 
                            src={(event.content as VisualImagePayload).url} 
                            alt="Visual" 
                            className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" 
                        />
                        {(event.content as VisualImagePayload).isHighRes && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-neon-blue text-[10px] px-2 py-1 rounded border border-neon-blue/30 font-mono">
                            IMAGEN 3 :: HQ
                          </div>
                        )}
                     </div>
                  </div>
                )}

                {/* 3. VIDEO (Veo) */}
                {event.type === 'video' && (
                  <div className="w-full min-w-[300px]">
                    <h3 className="text-neon-green text-sm font-bold mb-2 font-mono">
                      {(event.content as VisualVideoPayload).title}
                    </h3>
                    <div className="rounded-lg overflow-hidden border border-neon-blue/50 shadow-neon-blue/20 shadow-lg bg-black">
                      <video 
                        src={(event.content as VisualVideoPayload).videoUri}
                        controls
                        className="w-full aspect-video"
                        poster={(event.content as VisualVideoPayload).thumbnail}
                      />
                      <div className="p-2 text-xs text-center text-gray-500 font-mono">
                        GENERATED BY VEO
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. CHART */}
                {event.type === 'chart' && (
                  <div className="w-full min-w-[300px] sm:min-w-[400px]">
                    <h3 className="text-neon-green text-sm font-bold mb-2 font-mono">{(event.content as VisualChartPayload).title}</h3>
                    {renderChart(event.content as VisualChartPayload)}
                  </div>
                )}

              </div>

              {/* Timestamp */}
              <div className={`flex items-center gap-2 mt-1 text-[10px] font-mono text-gray-500 uppercase tracking-wider ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <span>{isUser ? 'USER' : 'LIA AGENT'}</span>
                <span>::</span>
                <span>{formatTime(event.timestamp)}</span>
              </div>

            </div>
          </div>
        );
      })}

      {/* Loading State */}
      {isLoading && (
        <div className="flex w-full justify-start animate-in fade-in duration-300">
           <div className="flex flex-col items-start max-w-[85%]">
              <div className="bg-gray-900/80 border border-neon-blue/30 p-4 rounded-2xl rounded-bl-none shadow-lg shadow-neon-blue/5">
                <div className="flex space-x-2 items-center h-6">
                  <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-neon-blue animate-pulse uppercase tracking-wider">
                 LIA AGENT :: PROCESSING
              </div>
           </div>
        </div>
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
};

export default VisualOutput;

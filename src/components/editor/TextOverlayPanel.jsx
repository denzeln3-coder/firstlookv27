import React, { useState } from 'react';
import { Plus, Type, Sparkles } from 'lucide-react';

const TEXT_STYLES = [
  { id: 'title', name: 'Title', fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  { id: 'subtitle', name: 'Subtitle', fontSize: 24, fontWeight: 'semibold', color: '#E5E5E5' },
  { id: 'body', name: 'Body', fontSize: 18, fontWeight: 'normal', color: '#D4D4D4' },
  { id: 'caption', name: 'Caption', fontSize: 14, fontWeight: 'normal', color: '#A3A3A3' },
  { id: 'cta', name: 'Call to Action', fontSize: 20, fontWeight: 'bold', color: '#6366F1' },
  { id: 'accent', name: 'Accent', fontSize: 28, fontWeight: 'bold', color: '#8B5CF6' }
];

export default function TextOverlayPanel({ project, onUpdate }) {
  const [newText, setNewText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('title');

  const handleAddText = () => {
    if (!newText.trim()) return;

    const overlays = project.edit_instructions?.text_overlays || [];
    const style = TEXT_STYLES.find(s => s.id === selectedStyle);

    overlays.push({
      id: `text_${Date.now()}`,
      text: newText,
      style: selectedStyle,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      color: style.color,
      position: { x: 50, y: 50 },
      start_time: 0,
      end_time: project.current_duration_seconds || 5,
      animation: 'fade'
    });

    project.edit_instructions.text_overlays = overlays;
    onUpdate();
    setNewText('');
  };

  const overlays = project?.edit_instructions?.text_overlays || [];
  const aiSuggestions = project?.edit_instructions?.enhancements?.suggestions || [];

  const handleApplySuggestion = (suggestion) => {
    const newOverlays = [...overlays, {
      id: `text_${Date.now()}`,
      ...suggestion
    }];
    project.edit_instructions.text_overlays = newOverlays;
    onUpdate();
  };

  return (
    <div className="space-y-4">
      {aiSuggestions.length > 0 && (
        <div className="p-4 bg-[#EC4899]/10 border border-[#EC4899]/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#EC4899]" />
            <h4 className="text-white text-sm font-semibold">AI Suggestions</h4>
          </div>
          <div className="space-y-2">
            {aiSuggestions.map((suggestion, idx) => (
              <div key={idx} className="p-3 bg-[#18181B] rounded-lg border border-[#27272A]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium mb-1">{suggestion.text}</div>
                    <div className="text-[#636366] text-xs mb-2">{suggestion.rationale}</div>
                    <div className="text-[#636366] text-xs">
                      {suggestion.start_time.toFixed(1)}s - {suggestion.end_time.toFixed(1)}s • {suggestion.style}
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplySuggestion(suggestion)}
                    className="px-3 py-1 bg-[#EC4899] text-white text-xs font-bold rounded hover:brightness-110 transition"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="block text-[#8E8E93] text-xs font-medium mb-2">Add Text</label>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Enter text..."
          className="w-full px-3 py-2 bg-[#18181B] text-white text-sm border border-[#27272A] rounded-lg focus:outline-none focus:border-[#6366F1]"
        />
      </div>

      <div>
        <label className="block text-[#8E8E93] text-xs font-medium mb-2">Style</label>
        <div className="grid grid-cols-2 gap-2">
          {TEXT_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`p-2 rounded-lg border text-xs font-medium transition ${
                selectedStyle === style.id
                  ? 'border-[#6366F1] bg-[#6366F1]/10 text-white'
                  : 'border-[#27272A] bg-[#18181B] text-[#8E8E93] hover:text-white'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleAddText}
        className="w-full py-2 bg-[#6366F1] text-white text-sm font-semibold rounded-lg hover:brightness-110 transition flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Text Overlay
      </button>

      {overlays.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-white text-sm font-semibold">Text Overlays ({overlays.length})</h4>
          {overlays.map((overlay) => (
            <div
              key={overlay.id}
              className="p-3 bg-[#18181B] rounded-lg border border-[#27272A]"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-white text-sm font-medium line-clamp-1">{overlay.text}</span>
                <span className="text-[#636366] text-xs whitespace-nowrap ml-2">
                  {overlay.start_time.toFixed(1)}s - {overlay.end_time.toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Type className="w-3 h-3" style={{ color: overlay.color }} />
                <span className="text-[#636366] text-xs capitalize">{overlay.style}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
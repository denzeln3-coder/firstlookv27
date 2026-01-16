import React, { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const CAPTION_STYLES = [
  { id: 'default', name: 'Default', bgColor: 'rgba(0,0,0,0.8)', textColor: '#FFFFFF' },
  { id: 'minimal', name: 'Minimal', bgColor: 'transparent', textColor: '#FFFFFF' },
  { id: 'bold', name: 'Bold', bgColor: '#6366F1', textColor: '#FFFFFF' },
  { id: 'outline', name: 'Outline', bgColor: 'transparent', textColor: '#FFFFFF', strokeColor: '#000000' }
];

export default function CaptionsPanel({ project, onUpdate }) {
  const [generating, setGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('default');

  const handleGenerateCaptions = async () => {
    setGenerating(true);
    toast.info('Generating captions...');

    try {
      // Mock caption generation - in production, use a transcription API
      const mockCaptions = [
        { start: 0, end: 2, text: 'Welcome to our pitch' },
        { start: 2, end: 5, text: 'We are solving a major problem' },
        { start: 5, end: 8, text: 'in the startup ecosystem' }
      ];

      const style = CAPTION_STYLES.find(s => s.id === selectedStyle);

      project.edit_instructions.captions = {
        enabled: true,
        style: selectedStyle,
        segments: mockCaptions,
        style_config: style
      };

      onUpdate();
      toast.success('Captions generated!');
    } catch (error) {
      console.error('Caption generation error:', error);
      toast.error('Failed to generate captions');
    } finally {
      setGenerating(false);
    }
  };

  const captions = project?.edit_instructions?.captions;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[#8E8E93] text-xs font-medium mb-2">Caption Style</label>
        <div className="grid grid-cols-2 gap-2">
          {CAPTION_STYLES.map((style) => (
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
        onClick={handleGenerateCaptions}
        disabled={generating}
        className="w-full py-3 bg-[#6366F1] text-white text-sm font-semibold rounded-lg hover:brightness-110 transition flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            Generate Auto Captions
          </>
        )}
      </button>

      {captions?.enabled && (
        <div className="p-3 bg-[#18181B] rounded-lg border border-[#27272A]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-medium">Captions Active</span>
            <button
              onClick={() => {
                project.edit_instructions.captions.enabled = false;
                onUpdate();
              }}
              className="text-[#EF4444] text-xs hover:underline"
            >
              Remove
            </button>
          </div>
          <div className="text-[#636366] text-xs">
            {captions.segments?.length || 0} segments • {captions.style} style
          </div>
        </div>
      )}
    </div>
  );
}
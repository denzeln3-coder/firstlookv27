import React, { useState } from 'react';
import { Sparkles, Copy, RefreshCw, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AIScriptGenerator({ onClose, onUseScript }) {
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [tone, setTone] = useState('professional');
  const [generatedScript, setGeneratedScript] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateScript = async () => {
    if (!description.trim()) {
      toast.error('Please describe your startup');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert pitch writer specializing in 15-second elevator pitches.

Generate a compelling 15-second pitch script based on:
- Startup Description: ${description}
- Target Audience: ${targetAudience || 'General audience'}
- Tone: ${tone}

The script should:
- Be exactly 15 seconds when read aloud (approximately 35-40 words)
- Follow this structure:
  1. Hook (2-3 seconds): Grab attention with the problem
  2. Solution (5-6 seconds): What your product does
  3. Value (4-5 seconds): Why it matters
  4. CTA (2-3 seconds): Clear call-to-action

Make it punchy, memorable, and conversation-friendly. Use simple language.`,
        response_json_schema: {
          type: "object",
          properties: {
            script: { type: "string" },
            tips: { type: "array", items: { type: "string" } },
            word_count: { type: "number" }
          }
        }
      });

      setGeneratedScript(result);
      toast.success('Script generated!');
    } catch (error) {
      console.error('Script generation error:', error);
      toast.error('Failed to generate script');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyScript = () => {
    if (generatedScript?.script) {
      navigator.clipboard.writeText(generatedScript.script);
      toast.success('Script copied!');
    }
  };

  const handleUseScript = () => {
    if (generatedScript?.script) {
      onUseScript(generatedScript.script);
      toast.success('Script ready to use!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#18181B] border-b border-[#27272A] p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[#FAFAFA] text-[20px] font-bold">AI Script Generator</h2>
              <p className="text-[#71717A] text-[13px]">Create the perfect 15-second pitch</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!generatedScript ? (
            <>
              <div>
                <label className="block text-[#FAFAFA] text-[14px] font-medium mb-2">
                  Describe your startup *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does your product do? What problem does it solve? What makes it unique?"
                  className="w-full h-32 px-4 py-3 bg-[#09090B] border border-[#27272A] rounded-xl text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#6366F1] resize-none"
                />
              </div>

              <div>
                <label className="block text-[#FAFAFA] text-[14px] font-medium mb-2">
                  Target Audience (optional)
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., Small business owners, Developers, Fitness enthusiasts"
                  className="w-full px-4 py-3 bg-[#09090B] border border-[#27272A] rounded-xl text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[#FAFAFA] text-[14px] font-medium mb-2">
                  Tone
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['professional', 'casual', 'energetic'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-4 py-2 rounded-lg text-[13px] font-medium transition ${
                        tone === t
                          ? 'bg-[#6366F1] text-white'
                          : 'bg-[#27272A] text-[#71717A] hover:bg-[#3F3F46]'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateScript}
                disabled={isGenerating || !description.trim()}
                className="w-full py-4 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Script
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="bg-[#09090B] border border-[#27272A] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#FAFAFA] text-[16px] font-semibold">Your Script</h3>
                  <span className="text-[#71717A] text-[13px]">{generatedScript.word_count} words</span>
                </div>
                <p className="text-[#FAFAFA] text-[15px] leading-relaxed mb-4 whitespace-pre-line">
                  {generatedScript.script}
                </p>
                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-2 text-[#6366F1] hover:text-[#818CF8] text-[13px] font-medium transition"
                >
                  <Copy className="w-4 h-4" />
                  Copy to clipboard
                </button>
              </div>

              {generatedScript.tips && generatedScript.tips.length > 0 && (
                <div className="bg-gradient-to-br from-[#6366F1]/10 to-[#8B5CF6]/10 border border-[#6366F1]/20 rounded-xl p-5">
                  <h3 className="text-[#FAFAFA] text-[14px] font-semibold mb-3">💡 Tips for Delivery</h3>
                  <ul className="space-y-2">
                    {generatedScript.tips.map((tip, idx) => (
                      <li key={idx} className="text-[#A1A1AA] text-[13px] flex gap-2">
                        <span className="text-[#6366F1] font-bold">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setGeneratedScript(null)}
                  className="flex-1 px-6 py-3 bg-[#27272A] text-white font-semibold rounded-xl hover:bg-[#3F3F46] transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
                <button
                  onClick={handleUseScript}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition"
                >
                  Use This Script
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
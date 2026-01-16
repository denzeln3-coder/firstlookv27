import React, { useState } from 'react';
import { ArrowLeft, Monitor, Video, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { compressVideo } from './videoCompressor';

export default function DemoInstructionsScreen({ onStart, onBack, onUploadDemo }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [recordingType, setRecordingType] = useState('screen');
  const [checklist, setChecklist] = useState({
    desktop: false,
    bookmarks: false,
    testData: false,
    zoom: false,
    internet: false,
    quiet: false
  });

  const handleStart = () => {
    if (dontShowAgain) {
      localStorage.setItem('hideDemoInstructions', 'true');
    }
    onStart(recordingType);
  };

  const toggleChecklistItem = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getVideoDuration = (blob) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = URL.createObjectURL(blob);
    });
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white overflow-auto pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#09090B]/80 backdrop-blur-xl z-10 px-4 py-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
        <button onClick={onBack} className="text-[#A1A1AA] hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="pt-20 px-6 max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="text-[48px] mb-3">🖥️</div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] mb-2">Record Your 2-Minute Demo</h1>
          <p className="text-[#A1A1AA] text-[16px]">Show your product in action — prove it works</p>
        </div>

        {/* Format Box */}
        <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 mb-8">
          <div className="flex items-center justify-around text-center">
            <div>
              <Monitor className="w-6 h-6 text-[#A1A1AA] mx-auto mb-2" />
              <div className="text-[12px] text-[#A1A1AA]">Screen + Voice</div>
            </div>
            <div className="w-px h-10 bg-[rgba(255,255,255,0.1)]" />
            <div>
              <div className="text-[18px] font-bold mb-1">16:9</div>
              <div className="text-[12px] text-[#A1A1AA]">Horizontal</div>
            </div>
            <div className="w-px h-10 bg-[rgba(255,255,255,0.1)]" />
            <div>
              <Clock className="w-6 h-6 text-[#A1A1AA] mx-auto mb-2" />
              <div className="text-[12px] text-[#A1A1AA]">2 minutes max</div>
            </div>
          </div>
        </div>

        {/* Recording Options */}
        <div className="mb-8">
          <h2 className="text-[20px] font-semibold mb-4">Choose your format:</h2>
          <div className="grid gap-3">
            <button
              onClick={() => setRecordingType('screen')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                recordingType === 'screen'
                  ? 'border-[#6366F1] bg-[#6366F1]/10'
                  : 'border-[rgba(255,255,255,0.1)] bg-[#18181B]'
              }`}
            >
              <div className="flex items-start gap-3">
                <Monitor className="w-6 h-6 text-[#A1A1AA] flex-shrink-0 mt-1" />
                <div>
                  <div className="text-[16px] font-semibold mb-1">Screen Recording</div>
                  <div className="text-[14px] text-[#A1A1AA]">Record your screen while you talk through the demo. Best for software products.</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setRecordingType('video')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                recordingType === 'video'
                  ? 'border-[#6366F1] bg-[#6366F1]/10'
                  : 'border-[rgba(255,255,255,0.1)] bg-[#18181B]'
              }`}
            >
              <div className="flex items-start gap-3">
                <Video className="w-6 h-6 text-[#A1A1AA] flex-shrink-0 mt-1" />
                <div>
                  <div className="text-[16px] font-semibold mb-1">Video Recording</div>
                  <div className="text-[14px] text-[#A1A1AA]">Record yourself demonstrating a physical product or showing something in real life.</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Demo Structure Timeline */}
        <div className="mb-8">
          <h2 className="text-[20px] font-semibold mb-4">Demo structure:</h2>
          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[#F97316]">0:00-0:15</span>
                <span className="text-[14px] font-semibold">Intro</span>
              </div>
              <div className="h-2 bg-[#F97316] rounded-full mb-1" style={{ width: '12.5%' }} />
              <div className="text-[13px] text-[#A1A1AA]">Quick hello and what you'll show</div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[#EF4444]">0:15-0:45</span>
                <span className="text-[14px] font-semibold">The Problem</span>
              </div>
              <div className="h-2 bg-[#EF4444] rounded-full mb-1" style={{ width: '25%' }} />
              <div className="text-[13px] text-[#A1A1AA]">Show the pain point or old way</div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[#8B5CF6]">0:45-1:30</span>
                <span className="text-[14px] font-semibold">The Solution</span>
              </div>
              <div className="h-2 bg-[#8B5CF6] rounded-full mb-1" style={{ width: '37.5%' }} />
              <div className="text-[13px] text-[#A1A1AA]">Walk through your product — show the core flow</div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[#3B82F6]">1:30-1:50</span>
                <span className="text-[14px] font-semibold">Key Differentiator</span>
              </div>
              <div className="h-2 bg-[#3B82F6] rounded-full mb-1" style={{ width: '16.67%' }} />
              <div className="text-[13px] text-[#A1A1AA]">What makes you different</div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[#22C55E]">1:50-2:00</span>
                <span className="text-[14px] font-semibold">Call to Action</span>
              </div>
              <div className="h-2 bg-[#22C55E] rounded-full mb-1" style={{ width: '8.33%' }} />
              <div className="text-[13px] text-[#A1A1AA]">Tell them how to try it</div>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="mb-8">
          <h2 className="text-[20px] font-semibold mb-4">Before you record:</h2>
          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-5 space-y-3">
            {[
              { key: 'desktop', label: 'Clean desktop (close unnecessary tabs)' },
              { key: 'bookmarks', label: 'Hide bookmarks bar' },
              { key: 'testData', label: 'Use test data (no personal info visible)' },
              { key: 'zoom', label: 'Zoom browser to 125%+ for readability' },
              { key: 'internet', label: 'Stable internet connection' },
              { key: 'quiet', label: 'Quiet environment' }
            ].map(item => (
              <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist[item.key]}
                  onChange={() => toggleChecklistItem(item.key)}
                  className="mt-0.5 w-4 h-4 rounded border-[#3F3F46] bg-transparent accent-[#6366F1]"
                />
                <span className="text-[14px] text-[#A1A1AA]">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mb-8">
          <h2 className="text-[20px] font-semibold mb-4">Pro tips:</h2>
          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-[#22C55E] text-[18px]">✓</span>
              <span className="text-[14px] text-[#A1A1AA]">Narrate what you're doing ("Now I'm clicking...")</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#22C55E] text-[18px]">✓</span>
              <span className="text-[14px] text-[#A1A1AA]">Pause on key features (let them absorb)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#22C55E] text-[18px]">✓</span>
              <span className="text-[14px] text-[#A1A1AA]">Show the "aha moment" clearly</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#22C55E] text-[18px]">✓</span>
              <span className="text-[14px] text-[#A1A1AA]">Keep mouse movements slow and deliberate</span>
            </div>
            <div className="w-full h-px bg-[rgba(255,255,255,0.06)] my-2" />
            <div className="flex items-start gap-3">
              <span className="text-[#EF4444] text-[18px]">✗</span>
              <span className="text-[14px] text-[#A1A1AA]">Don't rush — clarity beats speed</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#EF4444] text-[18px]">✗</span>
              <span className="text-[14px] text-[#A1A1AA]">Don't show sensitive data</span>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[16px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
          >
            Start Recording
          </button>
          
          <button
            onClick={() => {
              // Trigger file upload
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'video/*,.mp4,.mov,.webm';
              input.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                if (!file.type.startsWith('video/')) {
                  toast.error('Please select a video file');
                  return;
                }
                
                const loadingToast = toast.loading('Processing demo video...');
                
                try {
                  // Convert file to blob
                  let blob = new Blob([file], { type: file.type });
                  
                  // Check duration - only enforce maximum
                  const duration = await getVideoDuration(blob);
                  
                  if (duration > 120) {
                    toast.dismiss(loadingToast);
                    toast.error('Demo must be 2 minutes or less. Please trim your video.');
                    return;
                  }
                  
                  // Compress if needed
                  const sizeMB = blob.size / (1024 * 1024);
                  if (sizeMB > 100) {
                    toast.dismiss(loadingToast);
                    toast.loading('Compressing video...', { id: 'compress' });
                    
                    const result = await compressVideo(blob, 100);
                    toast.dismiss('compress');
                    
                    if (result.error) {
                      toast.error('Compression failed. Please try a smaller file or re-record.');
                      return;
                    }
                    
                    if (result.compressed) {
                      blob = result.blob;
                      toast.success(`Compressed: ${result.originalSize.toFixed(1)}MB → ${result.finalSize.toFixed(1)}MB`);
                    }
                  } else {
                    toast.dismiss(loadingToast);
                  }
                  
                  if (dontShowAgain) {
                    localStorage.setItem('hideDemoInstructions', 'true');
                  }
                  
                  if (onUploadDemo) {
                    onUploadDemo(blob);
                  }
                } catch (err) {
                  toast.dismiss(loadingToast);
                  toast.error('Failed to process video. Please try again.');
                  console.error('Demo upload error:', err);
                }
              };
              input.click();
            }}
            className="w-full py-4 bg-[#18181B] border-2 border-[#27272A] text-white text-[16px] font-semibold rounded-xl hover:bg-[#27272A] transition-all duration-200"
          >
            Upload Demo Video
          </button>
          
          <div className="text-center">
            <p className="text-[#636366] text-[11px]">
              Max 2 min | Best under 1:30 | MP4/MOV recommended
            </p>
          </div>
        </div>

        {/* Checkbox */}
        <label className="flex items-center gap-3 justify-center cursor-pointer mb-8">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded border-[#3F3F46] bg-transparent accent-[#6366F1]"
          />
          <span className="text-[14px] text-[#71717A]">Don't show this again</span>
        </label>
      </div>
    </div>
  );
}
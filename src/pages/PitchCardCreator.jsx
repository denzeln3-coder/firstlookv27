import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Download, Upload, RotateCcw, Save, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

const BACKGROUNDS = [
  { id: 'black', name: 'Pure Black', value: '#000000', type: 'solid' },
  { id: 'richblack', name: 'Rich Black', value: '#09090B', type: 'solid' },
  { id: 'white', name: 'White', value: '#FFFFFF', type: 'solid' },
  { id: 'indigo', name: 'Indigo', value: '#6366F1', type: 'solid' },
  { id: 'purple', name: 'Purple', value: '#8B5CF6', type: 'solid' },
  { id: 'blue', name: 'Blue', value: '#3B82F6', type: 'solid' },
  { id: 'green', name: 'Green', value: '#22C55E', type: 'solid' },
  { id: 'red', name: 'Red', value: '#EF4444', type: 'solid' },
  { id: 'grad-indigo-purple', name: 'Indigo to Purple', value: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', type: 'gradient' },
  { id: 'grad-blue-cyan', name: 'Blue to Cyan', value: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)', type: 'gradient' },
  { id: 'grad-sunset', name: 'Sunset', value: 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)', type: 'gradient' },
];

const FONTS = [
  { id: 'inter', name: 'Inter', value: "'Inter', sans-serif" },
  { id: 'poppins', name: 'Poppins', value: "'Poppins', sans-serif" },
  { id: 'montserrat', name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { id: 'roboto', name: 'Roboto', value: "'Roboto', sans-serif" },
  { id: 'playfair', name: 'Playfair Display', value: "'Playfair Display', serif" },
];

export default function PitchCardCreator() {
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const [isExporting, setIsExporting] = useState(false);
  const [logo, setLogo] = useState(null);
  const [startupName, setStartupName] = useState('Your Startup');
  const [tagline, setTagline] = useState('One line that explains everything');
  const [selectedBackground, setSelectedBackground] = useState(BACKGROUNDS[0]);
  const [selectedFontId, setSelectedFontId] = useState(FONTS[0].id);
  const [nameFontSize, setNameFontSize] = useState(48);
  const [taglineFontSize, setTaglineFontSize] = useState(20);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [nameAlign, setNameAlign] = useState('center');
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [logoSize, setLogoSize] = useState(100);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      return { ...authUser, ...profile };
    }
  });

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setLogo(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleExport = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
      const link = document.createElement('a');
      link.download = `${startupName.replace(/\s+/g, '-').toLowerCase()}-pitch-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Card downloaded!');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed. Please try again.');
    }
    setIsExporting(false);
  };

  const handleReset = () => {
    setLogo(null);
    setStartupName('Your Startup');
    setTagline('One line that explains everything');
    setSelectedBackground(BACKGROUNDS[0]);
    setSelectedFontId(FONTS[0].id);
    setTextColor('#FFFFFF');
    setNameFontSize(48);
    setTaglineFontSize(20);
    setNameAlign('center');
    setIsBold(true);
    setIsItalic(false);
    setLogoSize(100);
  };

  const selectedFont = FONTS.find(f => f.id === selectedFontId) || FONTS[0];

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(createPageUrl('Explore'))} className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-white text-xl font-bold">Pitch Card Creator</h1>
              <p className="text-[#8E8E93] text-sm">Design your branded card</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="p-2 rounded-lg bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:text-white transition" title="Reset"><RotateCcw className="w-5 h-5" /></button>
            <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50"><Download className="w-4 h-4" />{isExporting ? 'Exporting...' : 'Download'}</button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="space-y-6">
            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-3">Logo</label>
              <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-[#3F3F46] rounded-xl cursor-pointer hover:border-[#6366F1] transition bg-[#18181B]">
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                {logo ? <img src={logo} alt="Logo" className="h-16 object-contain" /> : <div className="flex items-center gap-2 text-[#71717A]"><Upload className="w-5 h-5" /><span>Upload Logo</span></div>}
              </label>
              {logo && <div className="mt-2"><label className="text-[#71717A] text-xs">Logo Size: {logoSize}px</label><input type="range" min="50" max="200" value={logoSize} onChange={(e) => setLogoSize(Number(e.target.value))} className="w-full" /></div>}
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-2">Startup Name</label>
              <input type="text" value={startupName} onChange={(e) => setStartupName(e.target.value)} className="w-full px-4 py-3 bg-[#18181B] border border-[#3F3F46] rounded-xl text-white focus:outline-none focus:border-[#6366F1]" />
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-2">Tagline</label>
              <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full px-4 py-3 bg-[#18181B] border border-[#3F3F46] rounded-xl text-white focus:outline-none focus:border-[#6366F1]" />
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-3">Background</label>
              <div className="flex flex-wrap gap-2">
                {BACKGROUNDS.map((bg) => (<button key={bg.id} onClick={() => setSelectedBackground(bg)} className={`w-12 h-12 rounded-xl transition ${selectedBackground.id === bg.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#000000]' : ''}`} style={{ background: bg.value }} title={bg.name} />))}
              </div>
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-3">Font</label>
              <div className="grid grid-cols-2 gap-2">
                {FONTS.map((font) => (<button key={font.id} onClick={() => setSelectedFontId(font.id)} className={`px-3 py-2 rounded-lg border transition text-sm ${selectedFontId === font.id ? 'border-[#6366F1] bg-[#6366F1]/20 text-white' : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93]'}`} style={{ fontFamily: font.value }}>{font.name}</button>))}
              </div>
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-3">Text Style</label>
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => setIsBold(!isBold)} className={`p-2 rounded-lg border transition ${isBold ? 'border-[#6366F1] bg-[#6366F1]/20 text-white' : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93]'}`}><Bold className="w-4 h-4" /></button>
                <button onClick={() => setIsItalic(!isItalic)} className={`p-2 rounded-lg border transition ${isItalic ? 'border-[#6366F1] bg-[#6366F1]/20 text-white' : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93]'}`}><Italic className="w-4 h-4" /></button>
                <div className="flex-1" />
                <button onClick={() => setNameAlign('left')} className={`p-2 rounded-lg border transition ${nameAlign === 'left' ? 'border-[#6366F1] bg-[#6366F1]/20 text-white' : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93]'}`}><AlignLeft className="w-4 h-4" /></button>
                <button onClick={() => setNameAlign('center')} className={`p-2 rounded-lg border transition ${nameAlign === 'center' ? 'border-[#6366F1] bg-[#6366F1]/20 text-white' : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93]'}`}><AlignCenter className="w-4 h-4" /></button>
                <button onClick={() => setNameAlign('right')} className={`p-2 rounded-lg border transition ${nameAlign === 'right' ? 'border-[#6366F1] bg-[#6366F1]/20 text-white' : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93]'}`}><AlignRight className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                <div><label className="text-[#71717A] text-xs">Name Size: {nameFontSize}px</label><input type="range" min="24" max="72" value={nameFontSize} onChange={(e) => setNameFontSize(Number(e.target.value))} className="w-full" /></div>
                <div><label className="text-[#71717A] text-xs">Tagline Size: {taglineFontSize}px</label><input type="range" min="12" max="36" value={taglineFontSize} onChange={(e) => setTaglineFontSize(Number(e.target.value))} className="w-full" /></div>
              </div>
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-2">Text Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-0" />
                <input type="text" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="flex-1 px-4 py-3 bg-[#18181B] border border-[#3F3F46] rounded-xl text-white focus:outline-none focus:border-[#6366F1] font-mono text-sm" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[#8E8E93] text-sm font-medium mb-3">Preview</label>
            <div className="sticky top-24">
              <div ref={cardRef} className="w-full aspect-[4/5] rounded-2xl overflow-hidden relative" style={{ background: selectedBackground.value }}>
                {logo && <img src={logo} alt="Logo" className="absolute top-8 left-1/2 -translate-x-1/2 object-contain" style={{ height: `${logoSize}px` }} />}
                <div className="absolute inset-0 flex flex-col justify-center p-8">
                  <h2 style={{ fontFamily: selectedFont.value, color: textColor, fontSize: `${nameFontSize}px`, textAlign: nameAlign, fontWeight: isBold ? 'bold' : 'normal', fontStyle: isItalic ? 'italic' : 'normal', marginBottom: '12px' }}>{startupName}</h2>
                  <p style={{ fontFamily: selectedFont.value, color: textColor, fontSize: `${taglineFontSize}px`, textAlign: nameAlign, opacity: 0.9 }}>{tagline}</p>
                </div>
              </div>
              <p className="text-[#71717A] text-xs text-center mt-3">Exports at 2x resolution</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

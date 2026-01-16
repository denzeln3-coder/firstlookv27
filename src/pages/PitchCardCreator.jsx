import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Download, Upload, RotateCcw, Save, Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

const BACKGROUNDS = [
  // Solid Colors
  { id: 'black', name: 'Pure Black', value: '#000000', type: 'solid' },
  { id: 'richblack', name: 'Rich Black', value: '#09090B', type: 'solid' },
  { id: 'white', name: 'White', value: '#FFFFFF', type: 'solid' },
  { id: 'indigo', name: 'Indigo', value: '#6366F1', type: 'solid' },
  { id: 'purple', name: 'Purple', value: '#8B5CF6', type: 'solid' },
  { id: 'blue', name: 'Blue', value: '#3B82F6', type: 'solid' },
  { id: 'green', name: 'Green', value: '#22C55E', type: 'solid' },
  { id: 'red', name: 'Red', value: '#EF4444', type: 'solid' },
  { id: 'orange', name: 'Orange', value: '#F97316', type: 'solid' },
  { id: 'yellow', name: 'Yellow', value: '#EAB308', type: 'solid' },
  { id: 'pink', name: 'Pink', value: '#EC4899', type: 'solid' },
  { id: 'teal', name: 'Teal', value: '#14B8A6', type: 'solid' },
  // Gradients
  { id: 'grad-indigo-purple', name: 'Indigo to Purple', value: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', type: 'gradient' },
  { id: 'grad-blue-cyan', name: 'Blue to Cyan', value: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)', type: 'gradient' },
  { id: 'grad-sunset', name: 'Sunset', value: 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)', type: 'gradient' },
  { id: 'grad-green-teal', name: 'Green to Teal', value: 'linear-gradient(135deg, #22C55E 0%, #14B8A6 100%)', type: 'gradient' },
  { id: 'grad-purple-pink', name: 'Purple to Pink', value: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)', type: 'gradient' },
  { id: 'grad-black-indigo', name: 'Black to Indigo', value: 'linear-gradient(135deg, #000000 0%, #6366F1 100%)', type: 'gradient' },
  { id: 'grad-ocean', name: 'Ocean', value: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 50%, #8B5CF6 100%)', type: 'gradient' },
  { id: 'grad-fire', name: 'Fire', value: 'linear-gradient(135deg, #EF4444 0%, #F97316 50%, #EAB308 100%)', type: 'gradient' }
];

const FONTS = [
  { id: 'space', name: 'Space Grotesk', value: "'Space Grotesk', sans-serif" },
  { id: 'inter', name: 'Inter', value: "'Inter', sans-serif" },
  { id: 'playfair', name: 'Playfair Display', value: "'Playfair Display', serif" },
  { id: 'roboto', name: 'Roboto', value: "'Roboto', sans-serif" },
  { id: 'montserrat', name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { id: 'poppins', name: 'Poppins', value: "'Poppins', sans-serif" },
  { id: 'bebas', name: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
  { id: 'oswald', name: 'Oswald', value: "'Oswald', sans-serif" },
  { id: 'raleway', name: 'Raleway', value: "'Raleway', sans-serif" },
  { id: 'lora', name: 'Lora', value: "'Lora', serif" },
  { id: 'source', name: 'Source Sans Pro', value: "'Source Sans Pro', sans-serif" },
  { id: 'dm', name: 'DM Sans', value: "'DM Sans', sans-serif" },
  { id: 'merriweather', name: 'Merriweather', value: "'Merriweather', serif" },
  { id: 'opensans', name: 'Open Sans', value: "'Open Sans', sans-serif" },
  { id: 'nunito', name: 'Nunito', value: "'Nunito', sans-serif" },
  { id: 'lato', name: 'Lato', value: "'Lato', sans-serif" },
  { id: 'ubuntu', name: 'Ubuntu', value: "'Ubuntu', sans-serif" },
  { id: 'archivo', name: 'Archivo Black', value: "'Archivo Black', sans-serif" },
  { id: 'righteous', name: 'Righteous', value: "'Righteous', sans-serif" },
  { id: 'fira', name: 'Fira Sans', value: "'Fira Sans', sans-serif" },
  { id: 'quicksand', name: 'Quicksand', value: "'Quicksand', sans-serif" },
  { id: 'josefin', name: 'Josefin Sans', value: "'Josefin Sans', sans-serif" },
  { id: 'anton', name: 'Anton', value: "'Anton', sans-serif" },
  { id: 'kanit', name: 'Kanit', value: "'Kanit', sans-serif" },
  { id: 'barlow', name: 'Barlow', value: "'Barlow', sans-serif" },
  { id: 'cabin', name: 'Cabin', value: "'Cabin', sans-serif" },
  { id: 'exo', name: 'Exo 2', value: "'Exo 2', sans-serif" },
  { id: 'crimson', name: 'Crimson Text', value: "'Crimson Text', serif" },
  { id: 'abril', name: 'Abril Fatface', value: "'Abril Fatface', serif" },
  { id: 'yanone', name: 'Yanone Kaffeesatz', value: "'Yanone Kaffeesatz', sans-serif" }
];

const TEMPLATES = [
  { id: 'minimal', name: 'Minimal', logoPos: 'top-left', nameAlign: 'center', nameSize: 48 },
  { id: 'bold', name: 'Bold', logoPos: 'center', nameAlign: 'center', nameSize: 64 },
  { id: 'professional', name: 'Professional', logoPos: 'center', nameAlign: 'center', nameSize: 40 },
  { id: 'modern', name: 'Modern', logoPos: 'left', nameAlign: 'left', nameSize: 52 }
];

export default function PitchCardCreator() {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const queryClient = useQueryClient();

  // Load all Google Fonts at once
  React.useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Inter:wght@400;700&family=Playfair+Display:wght@400;700&family=Roboto:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&family=Bebas+Neue&family=Oswald:wght@400;700&family=Raleway:wght@400;700&family=Lora:wght@400;700&family=Source+Sans+Pro:wght@400;700&family=DM+Sans:wght@400;700&family=Merriweather:wght@400;700&family=Open+Sans:wght@400;700&family=Nunito:wght@400;700&family=Lato:wght@400;700&family=Ubuntu:wght@400;700&family=Archivo+Black&family=Righteous&family=Fira+Sans:wght@400;700&family=Quicksand:wght@400;700&family=Josefin+Sans:wght@400;700&family=Anton&family=Kanit:wght@400;700&family=Barlow:wght@400;700&family=Cabin:wght@400;700&family=Exo+2:wght@400;700&family=Crimson+Text:wght@400;700&family=Abril+Fatface&family=Yanone+Kaffeesatz:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    link.id = 'google-fonts-loader';
    document.head.appendChild(link);
    
    return () => {
      const existingLink = document.getElementById('google-fonts-loader');
      if (existingLink) {
        document.head.removeChild(existingLink);
      }
    };
  }, []);

  const [isExporting, setIsExporting] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  
  // Content
  const [logo, setLogo] = useState(null);
  const [startupName, setStartupName] = useState('Your Startup');
  const [tagline, setTagline] = useState('One line that explains everything');
  
  // Background
  const [selectedBackground, setSelectedBackground] = useState(BACKGROUNDS[0]);
  const [customGradientStart, setCustomGradientStart] = useState('#6366F1');
  const [customGradientEnd, setCustomGradientEnd] = useState('#8B5CF6');
  
  // Typography
  const [selectedFontId, setSelectedFontId] = useState(FONTS[0].id);
  const [nameFontSize, setNameFontSize] = useState(48);
  const [taglineFontSize, setTaglineFontSize] = useState(20);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [nameAlign, setNameAlign] = useState('center');
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.2);
  
  // Logo
  const [logoSize, setLogoSize] = useState(100);
  const [logoPosition, setLogoPosition] = useState('top-left');
  const [logoPadding, setLogoPadding] = useState(40);
  
  // Force font to load when selected
  React.useEffect(() => {
    const currentSelectedFont = FONTS.find(f => f.id === selectedFontId);
    if (currentSelectedFont && document.fonts) {
      document.fonts.load(`700 16px ${currentSelectedFont.value}`).catch(() => {});
    }
  }, [selectedFontId]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: userPitches = [] } = useQuery({
    queryKey: ['userPitches', user?.id],
    queryFn: () => base44.entities.Pitch.filter({ founder_id: user.id }),
    enabled: !!user
  });

  const applyTemplate = (template) => {
    setLogoPosition(template.logoPos);
    setNameAlign(template.nameAlign);
    setNameFontSize(template.nameSize);
    toast.success(`${template.name} template applied`);
  };

  const getBackgroundStyle = () => {
    if (selectedBackground.id === 'custom') {
      return `linear-gradient(135deg, ${customGradientStart} 0%, ${customGradientEnd} 100%)`;
    }
    return selectedBackground.value;
  };

  const getLogoPositionStyles = () => {
    const positions = {
      'top-left': { top: `${logoPadding}px`, left: `${logoPadding}px`, transform: 'none' },
      'top-right': { top: `${logoPadding}px`, right: `${logoPadding}px`, transform: 'none' },
      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      'bottom-left': { bottom: `${logoPadding}px`, left: `${logoPadding}px`, transform: 'none' },
      'bottom-right': { bottom: `${logoPadding}px`, right: `${logoPadding}px`, transform: 'none' },
      'left': { top: '50%', left: `${logoPadding}px`, transform: 'translateY(-50%)' }
    };
    return positions[logoPosition] || positions['top-left'];
  };

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
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false
      });
      
      const link = document.createElement('a');
      link.download = `${startupName.replace(/\s+/g, '-').toLowerCase()}-pitch-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Card downloaded!');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed. Please try again.', {
        action: {
          label: 'Retry',
          onClick: () => handleExport()
        }
      });
    }
    setIsExporting(false);
  };

  const saveToProfileMutation = useMutation({
    mutationFn: async (imageData) => {
      const response = await fetch(imageData);
      const blob = await response.blob();
      const file = new File([blob], 'pitch-card.png', { type: 'image/png' });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ profile_header_url: file_url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Saved as profile header!');
      setShowSaveOptions(false);
    },
    onError: () => {
      toast.error('Failed to save to profile');
    }
  });

  const saveToPitchMutation = useMutation({
    mutationFn: async ({ pitchId, imageData }) => {
      const response = await fetch(imageData);
      const blob = await response.blob();
      const file = new File([blob], 'pitch-card.png', { type: 'image/png' });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Pitch.update(pitchId, { thumbnail_url: file_url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPitches'] });
      toast.success('Saved as pitch thumbnail!');
      setShowSaveOptions(false);
    },
    onError: () => {
      toast.error('Failed to save to pitch');
    }
  });

  const handleSave = async (type, pitchId = null) => {
    if (!cardRef.current) return;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false
      });
      
      const imageData = canvas.toDataURL('image/png');
      
      if (type === 'profile') {
        saveToProfileMutation.mutate(imageData);
      } else if (type === 'pitch' && pitchId) {
        saveToPitchMutation.mutate({ pitchId, imageData });
      }
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save card');
    }
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
    setIsUnderline(false);
    setLetterSpacing(0);
    setLineHeight(1.2);
    setLogoSize(100);
    setLogoPosition('top-left');
    setLogoPadding(40);
  };

  const selectedFont = FONTS.find(f => f.id === selectedFontId) || FONTS[0];

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(createPageUrl('CreatorStudio'))}
              className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">Pitch Card Creator</h1>
              <p className="text-[#8E8E93] text-sm">Design your branded card</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:text-white transition"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSaveOptions(!showSaveOptions)}
              className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.06)] text-white font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Download'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="space-y-6">
            {/* Templates */}
            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-3">Templates</label>
              <div className="grid grid-cols-4 gap-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="px-3 py-2 bg-[#18181B] border border-[#3F3F46] rounded-lg text-white text-sm hover:border-[#6366F1] transition"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-3">Logo</label>
              <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-[#3F3F46] rounded-xl cursor-pointer hover:border-[#6366F1] transition bg-[#18181B]">
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                {logo ? (
                  <img src={logo} alt="Logo" className="h-16 object-contain" />
                ) : (
                  <div className="flex items-center gap-2 text-[#71717A]">
                    <Upload className="w-5 h-5" />
                    <span>Upload Logo</span>
                  </div>
                )}
              </label>
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-2">Startup Name</label>
              <input
                type="text"
                value={startupName}
                onChange={(e) => setStartupName(e.target.value)}
                className="w-full px-4 py-3 bg-[#18181B] border border-[#3F3F46] rounded-xl text-white focus:outline-none focus:border-[#6366F1]"
              />
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-2">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-4 py-3 bg-[#18181B] border border-[#3F3F46] rounded-xl text-white focus:outline-none focus:border-[#6366F1]"
              />
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-3">Background</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBackground(bg)}
                    className={`w-12 h-12 rounded-xl transition ${
                      selectedBackground.id === bg.id
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#000000]'
                        : ''
                    }`}
                    style={{ background: bg.value }}
                    title={bg.name}
                  />
                ))}
              </div>
              <div className="p-3 bg-[#18181B] border border-[#3F3F46] rounded-xl">
                <label className="block text-[#71717A] text-xs font-medium mb-2">Custom Gradient</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customGradientStart}
                    onChange={(e) => {
                      setCustomGradientStart(e.target.value);
                      setSelectedBackground({ id: 'custom', name: 'Custom', value: '', type: 'gradient' });
                    }}
                    className="w-10 h-10 rounded-lg cursor-pointer"
                  />
                  <span className="text-[#71717A] text-xs">to</span>
                  <input
                    type="color"
                    value={customGradientEnd}
                    onChange={(e) => {
                      setCustomGradientEnd(e.target.value);
                      setSelectedBackground({ id: 'custom', name: 'Custom', value: '', type: 'gradient' });
                    }}
                    className="w-10 h-10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-3">Font Family</label>
              <div className="grid grid-cols-2 gap-2">
                {FONTS.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => setSelectedFontId(font.id)}
                    className={`px-3 py-2 rounded-lg border transition text-sm ${
                      selectedFontId === font.id
                        ? 'border-[#6366F1] bg-[#6366F1]/20 text-white'
                        : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93] hover:border-[#6366F1]'
                    }`}
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-3">Text Style</label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsBold(!isBold)}
                    className={`p-2 rounded-lg border transition ${
                      isBold ? 'border-[#6366F1] bg-[#6366F1]/20 text-white' : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93]'
                    }`}
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsItalic(!isItalic)}
                    className={`p-2 rounded-lg border transition ${
                      isItalic ? 'border-[#6366F1] bg-[#6366F1]/20 text-white' : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93]'
                    }`}
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsUnderline(!isUnderline)}
                    className={`p-2 rounded-lg border transition ${
                      isUnderline ? 'border-[#6366F1] bg-[#6366F1]/20 text-white' : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93]'
                    }`}
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => setNameAlign('left')}
                    className={`p-2 rounded-lg border transition ${
                      nameAlign === 'left' ? 'border-[#6366F1] bg-[#6366F1]/20 text-white' : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93]'
                    }`}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setNameAlign('center')}
                    className={`p-2 rounded-lg border transition ${
                      nameAlign === 'center' ? 'border-[#6366F1] bg-[#6366F1]/20 text-white' : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93]'
                    }`}
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setNameAlign('right')}
                    className={`p-2 rounded-lg border transition ${
                      nameAlign === 'right' ? 'border-[#6366F1] bg-[#6366F1]/20 text-white' : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93]'
                    }`}
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </div>
                
                <div>
                  <label className="text-[#71717A] text-xs">Name Size: {nameFontSize}px</label>
                  <input
                    type="range"
                    min="12"
                    max="72"
                    value={nameFontSize}
                    onChange={(e) => setNameFontSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-[#71717A] text-xs">Tagline Size: {taglineFontSize}px</label>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={taglineFontSize}
                    onChange={(e) => setTaglineFontSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-[#71717A] text-xs">Letter Spacing: {letterSpacing}px</label>
                  <input
                    type="range"
                    min="-5"
                    max="10"
                    step="0.5"
                    value={letterSpacing}
                    onChange={(e) => setLetterSpacing(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-[#71717A] text-xs">Line Height: {lineHeight}</label>
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.1"
                    value={lineHeight}
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-2">Text Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1 px-4 py-3 bg-[#18181B] border border-[#3F3F46] rounded-xl text-white focus:outline-none focus:border-[#6366F1] font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-3">Logo Controls</label>
              <div className="space-y-3">
                <div>
                  <label className="text-[#71717A] text-xs">Logo Size: {logoSize}px</label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-[#71717A] text-xs mb-2 block">Logo Position</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['top-left', 'center', 'top-right', 'left', 'bottom-left', 'bottom-right'].map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setLogoPosition(pos)}
                        className={`px-3 py-2 rounded-lg border transition text-xs ${
                          logoPosition === pos
                            ? 'border-[#6366F1] bg-[#6366F1]/20 text-white'
                            : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93]'
                        }`}
                      >
                        {pos.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-[#71717A] text-xs">Padding: {logoPadding}px</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={logoPadding}
                    onChange={(e) => setLogoPadding(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[#8E8E93] text-sm font-medium mb-3">Preview</label>
            <div className="sticky top-24">
              <div
                ref={cardRef}
                className="w-full aspect-[4/5] rounded-2xl overflow-hidden relative"
                style={{
                  background: getBackgroundStyle()
                }}
              >
                {logo && (
                  <img
                    src={logo}
                    alt="Logo"
                    className="absolute object-contain"
                    style={{
                      height: `${logoSize}px`,
                      ...getLogoPositionStyles()
                    }}
                  />
                )}
                <div 
                  className={`absolute inset-0 flex flex-col p-8 ${
                    logoPosition === 'center' ? 'justify-end' : 
                    logoPosition === 'left' ? 'justify-center pl-32' : 
                    'justify-center'
                  }`}
                >
                  <h2
                    style={{
                      fontFamily: selectedFont.value,
                      color: textColor,
                      fontSize: `${nameFontSize}px`,
                      textAlign: nameAlign,
                      fontWeight: isBold ? 'bold' : 'normal',
                      fontStyle: isItalic ? 'italic' : 'normal',
                      textDecoration: isUnderline ? 'underline' : 'none',
                      letterSpacing: `${letterSpacing}px`,
                      lineHeight: lineHeight,
                      marginBottom: '12px'
                    }}
                  >
                    {startupName}
                  </h2>
                  <p
                    style={{
                      fontFamily: selectedFont.value,
                      color: textColor,
                      fontSize: `${taglineFontSize}px`,
                      textAlign: nameAlign,
                      opacity: 0.9,
                      letterSpacing: `${letterSpacing * 0.5}px`,
                      lineHeight: lineHeight
                    }}
                  >
                    {tagline}
                  </p>
                </div>
              </div>
              <p className="text-[#71717A] text-xs text-center mt-3">
                Exports at 2x resolution for crisp social media posts
              </p>
            </div>
          </div>
        </div>
      </div>

      {showSaveOptions && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowSaveOptions(false)}>
          <div className="bg-[#18181B] rounded-2xl p-6 max-w-md w-full border border-[#3F3F46]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white text-xl font-bold mb-4">Save Pitch Card</h3>
            
            <div className="space-y-3">
              <button
                onClick={() => handleSave('profile')}
                disabled={saveToProfileMutation.isPending || !user}
                className="w-full px-4 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 text-left"
              >
                {saveToProfileMutation.isPending ? 'Saving...' : 'Save as Profile Header'}
              </button>
              
              {userPitches.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-[#8E8E93] text-sm">Save as Pitch Thumbnail:</label>
                  {userPitches.map((pitch) => (
                    <button
                      key={pitch.id}
                      onClick={() => handleSave('pitch', pitch.id)}
                      disabled={saveToPitchMutation.isPending}
                      className="w-full px-4 py-3 bg-[#27272A] text-white font-medium rounded-xl hover:bg-[#3F3F46] transition disabled:opacity-50 text-left"
                    >
                      {pitch.startup_name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[#71717A] text-sm">No pitches yet. Create one to save as thumbnail.</p>
              )}
              
              <button
                onClick={() => { handleExport(); setShowSaveOptions(false); }}
                className="w-full px-4 py-3 bg-[#27272A] text-white font-medium rounded-xl hover:bg-[#3F3F46] transition text-left"
              >
                Just Download (No Save)
              </button>
            </div>
            
            <button
              onClick={() => setShowSaveOptions(false)}
              className="w-full mt-4 px-4 py-2 text-[#8E8E93] hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
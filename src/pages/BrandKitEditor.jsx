import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Upload, Save, Trash2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '../components/useSubscription';
import UpgradeModal from '../components/UpgradeModal';
import { toast } from 'sonner';

const FONTS = [
  { id: 'space', name: 'Space Grotesk', value: "'Space Grotesk', sans-serif" },
  { id: 'inter', name: 'Inter', value: "'Inter', sans-serif" },
  { id: 'playfair', name: 'Playfair Display', value: "'Playfair Display', serif" },
  { id: 'roboto', name: 'Roboto Mono', value: "'Roboto Mono', monospace" }
];

const PRESET_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', 
  '#10B981', '#3B82F6', '#EF4444', '#06B6D4',
  '#1F2937', '#FFFFFF'
];

export default function BrandKitEditor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isPro } = useSubscription();
  
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6366F1');
  const [secondaryColor, setSecondaryColor] = useState('#8B5CF6');
  const [selectedFontId, setSelectedFontId] = useState(FONTS[0].id);

  const { data: existingBrandKit, isLoading } = useQuery({
    queryKey: ['brandKit', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const kits = await base44.entities.BrandKit.filter({ user_id: user.id });
      return kits[0] || null;
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (existingBrandKit) {
      setBrandName(existingBrandKit.name || '');
      setTagline(existingBrandKit.tagline || '');
      setLogoUrl(existingBrandKit.logo_url || '');
      setPrimaryColor(existingBrandKit.primary_color || '#6366F1');
      setSecondaryColor(existingBrandKit.secondary_color || '#8B5CF6');
      const matchingFont = FONTS.find(f => f.value === existingBrandKit.font_family);
      setSelectedFontId(matchingFont?.id || FONTS[0].id);
    }
  }, [existingBrandKit]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setLogoUrl(result.file_url);
      toast.success('Logo uploaded!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload logo');
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please log in to save your brand kit');
      return;
    }

    if (!isPro) {
      setShowUpgrade(true);
      return;
    }

    setIsSaving(true);
    try {
      const selectedFontValue = FONTS.find(f => f.id === selectedFontId)?.value || FONTS[0].value;
      const brandKitData = {
        user_id: user.id,
        name: brandName,
        tagline: tagline,
        logo_url: logoUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        font_family: selectedFontValue
      };

      if (existingBrandKit) {
        await base44.entities.BrandKit.update(existingBrandKit.id, brandKitData);
      } else {
        await base44.entities.BrandKit.create(brandKitData);
      }

      queryClient.invalidateQueries({ queryKey: ['brandKit', user.id] });
      toast.success('Brand kit saved!');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save brand kit');
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!existingBrandKit) return;
    
    if (!confirm('Are you sure you want to delete your brand kit?')) return;

    try {
      await base44.entities.BrandKit.delete(existingBrandKit.id);
      queryClient.invalidateQueries({ queryKey: ['brandKit', user.id] });
      setBrandName('');
      setTagline('');
      setLogoUrl('');
      setPrimaryColor('#6366F1');
      setSecondaryColor('#8B5CF6');
      setSelectedFontId(FONTS[0].id);
      toast.success('Brand kit deleted');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete brand kit');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
              <h1 className="text-white text-xl font-bold">Brand Kit</h1>
              <p className="text-[#8E8E93] text-sm">Save your brand identity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {existingBrandKit && (
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg bg-[rgba(255,255,255,0.06)] text-[#EF4444] hover:bg-[#EF4444]/20 transition"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="space-y-8">
          <div>
            <label className="block text-[#8E8E93] text-sm font-medium mb-3">Logo</label>
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-[#3F3F46] rounded-xl cursor-pointer hover:border-[#6366F1] transition bg-[#18181B]">
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-20 object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#71717A]">
                  <Upload className="w-8 h-8" />
                  <span>Upload your logo</span>
                </div>
              )}
            </label>
          </div>

          <div>
            <label className="block text-[#8E8E93] text-sm font-medium mb-2">Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Your startup name"
              className="w-full px-4 py-3 bg-[#18181B] border border-[#3F3F46] rounded-xl text-white focus:outline-none focus:border-[#6366F1] placeholder:text-[#71717A]"
            />
          </div>

          <div>
            <label className="block text-[#8E8E93] text-sm font-medium mb-2">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Your catchy tagline"
              className="w-full px-4 py-3 bg-[#18181B] border border-[#3F3F46] rounded-xl text-white focus:outline-none focus:border-[#6366F1] placeholder:text-[#71717A]"
            />
          </div>

          <div>
            <label className="block text-[#8E8E93] text-sm font-medium mb-3">Primary Color</label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-14 h-14 rounded-xl cursor-pointer border-0"
              />
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setPrimaryColor(color)}
                    className={`w-10 h-10 rounded-lg transition ${
                      primaryColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#000000]' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[#8E8E93] text-sm font-medium mb-3">Secondary Color</label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-14 h-14 rounded-xl cursor-pointer border-0"
              />
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSecondaryColor(color)}
                    className={`w-10 h-10 rounded-lg transition ${
                      secondaryColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#000000]' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[#8E8E93] text-sm font-medium mb-3">Font</label>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => setSelectedFontId(font.id)}
                  className={`px-4 py-3 rounded-xl border transition text-left ${
                    selectedFontId === font.id
                      ? 'border-[#6366F1] bg-[#6366F1]/20 text-white'
                      : 'border-[#3F3F46] bg-[#18181B] text-[#8E8E93] hover:border-[#6366F1]'
                  }`}
                  style={{ fontFamily: font.value }}
                >
                  <span className="text-lg">{font.name}</span>
                  <br />
                  <span className="text-sm opacity-70">Aa Bb Cc 123</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 bg-[#18181B] rounded-2xl border border-[#3F3F46]">
            <h3 className="text-white font-semibold mb-4">Preview</h3>
            <div
              className="p-6 rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                fontFamily: selectedFont.value
              }}
            >
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="h-12 object-contain mb-4" />
              )}
              <h2 className="text-2xl font-bold text-white mb-2">
                {brandName || 'Your Brand'}
              </h2>
              <p className="text-white/80">
                {tagline || 'Your tagline here'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="Brand Kit"
      />
    </div>
  );
}
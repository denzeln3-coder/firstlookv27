import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Video, Upload, Info, Image, MapPin, Users, DollarSign, TrendingUp, Globe, Twitter } from 'lucide-react';
import { toast } from 'sonner';
import { compressVideo } from './videoCompressor';

export default function PitchInfoForm({ initialData, onSubmit, onBack, onUploadPitch }) {
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const [formData, setFormData] = useState(initialData || {
    startup_name: '',
    one_liner: '',
    product_url: '',
    category: 'SaaS',
    product_stage: 'MVP',
    team_size: 1,
    location: '',
    funding_stage: '',
    funding_amount: '',
    traction_metrics: '',
    twitter_url: '',
    linkedin_url: '',
    is_private: false,
    is_pinned: false
  });
  
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [currentSection, setCurrentSection] = useState('basic'); // basic, details, links

  useEffect(() => {
    if (formData.startup_name && formData.startup_name.trim()) {
      localStorage.setItem('firstlook_pitch_draft', JSON.stringify(formData));
    }
  }, [formData]);

  const validateField = (name, value) => {
    switch (name) {
      case 'startup_name':
        if (!value.trim()) return 'Startup name is required';
        if (value.length > 50) return 'Maximum 50 characters';
        return '';
      case 'one_liner':
        if (!value.trim()) return 'One-liner is required';
        if (value.length > 100) return 'Maximum 100 characters';
        return '';
      case 'category':
        if (!value) return 'Category is required';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const newValue = type === 'number' ? parseInt(value) || 1 : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    if (touched[name]) {
      const error = validateField(name, newValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5MB');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const newErrors = {};
    ['startup_name', 'one_liner', 'category'].forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({ startup_name: true, one_liner: true, category: true });
      return false;
    }
    return true;
  };

  const prepareFormData = () => {
    let productUrl = formData.product_url?.trim() || '';
    if (productUrl && !productUrl.match(/^https?:\/\//i)) {
      productUrl = 'https://' + productUrl;
    }
    return { ...formData, product_url: productUrl, logoFile };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setCurrentSection('basic');
      return;
    }
    setShowMethodPicker(true);
  };

  const handleRecordVideo = () => {
    setShowMethodPicker(false);
    onSubmit(prepareFormData());
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('video/')) {
      toast.error('Please upload an MP4, MOV, or WebM video');
      return;
    }

    setIsProcessingUpload(true);
    const loadingToast = toast.loading('Validating video...');

    try {
      let blob = new Blob([file], { type: file.type });
      const duration = await getVideoDuration(blob);
      
      if (duration > 120) {
        toast.dismiss(loadingToast);
        toast.error('Video must be 2 minutes or less');
        setIsProcessingUpload(false);
        return;
      }

      if (duration < 3) {
        toast.dismiss(loadingToast);
        toast.error('Video must be at least 3 seconds long');
        setIsProcessingUpload(false);
        return;
      }

      const fileSizeMB = blob.size / (1024 * 1024);
      
      if (fileSizeMB > 50) {
        toast.dismiss(loadingToast);
        toast.error('Video too large. Please upload a video under 50MB.');
        setIsProcessingUpload(false);
        return;
      }

      if (fileSizeMB > 45) {
        toast.dismiss(loadingToast);
        toast.loading('Large file detected. Compressing...', { id: 'compress' });
        const result = await compressVideo(blob, 45);
        if (result.compressed) {
          blob = result.blob;
          toast.dismiss('compress');
          toast.success(`Compressed: ${result.originalSize.toFixed(1)}MB → ${result.finalSize.toFixed(1)}MB`);
        } else {
          toast.dismiss('compress');
        }
      } else {
        toast.dismiss(loadingToast);
      }

      setShowMethodPicker(false);
      if (onUploadPitch) {
        onUploadPitch(blob, prepareFormData());
      }
      
    } catch (error) {
      console.error('Error processing video:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to process video. Please try again.');
    } finally {
      setIsProcessingUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

  const isValid = !Object.values(errors).some(e => e) && formData.startup_name && formData.one_liner && formData.category;

  const handleBack = () => {
    if (showMethodPicker) {
      setShowMethodPicker(false);
      return;
    }
    if (currentSection === 'links') {
      setCurrentSection('details');
      return;
    }
    if (currentSection === 'details') {
      setCurrentSection('basic');
      return;
    }
    onBack();
  };

  const sectionProgress = currentSection === 'basic' ? '33%' : currentSection === 'details' ? '66%' : '100%';

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <div className="h-1 bg-[#18181B]">
        <div className="h-full bg-[#6366F1] transition-all duration-300" style={{ width: sectionProgress }} />
      </div>

      <div className="px-6 py-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
        <button onClick={handleBack} className="text-[#A1A1AA] hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-[14px] text-[#71717A]">
          {currentSection === 'basic' ? 'Basic Info' : currentSection === 'details' ? 'Details' : 'Links'}
        </span>
        <div className="w-5" />
      </div>

      <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
      <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />

      {/* Method Picker Modal */}
      {showMethodPicker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-[24px] font-bold text-white mb-2">Create your pitch</h2>
            <p className="text-[#A1A1AA] text-[14px] mb-6">Choose how to add your video</p>

            <div className="space-y-3">
              <button
                onClick={handleUploadClick}
                disabled={isProcessingUpload}
                className="w-full p-4 bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 border-2 border-[#6366F1] rounded-xl text-left hover:from-[#6366F1]/30 hover:to-[#8B5CF6]/30 transition-all disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#6366F1] flex items-center justify-center flex-shrink-0">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[16px] font-semibold text-white">Upload Video</span>
                      <span className="px-2 py-0.5 bg-[#22C55E] text-white text-[10px] font-bold rounded-full">RECOMMENDED</span>
                    </div>
                    <p className="text-[13px] text-[#A1A1AA]">Upload a pre-recorded video (up to 50MB)</p>
                  </div>
                </div>
              </button>

              <button
                onClick={handleRecordVideo}
                disabled={isProcessingUpload}
                className="w-full p-4 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-xl text-left hover:bg-[rgba(255,255,255,0.1)] transition-all disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#27272A] flex items-center justify-center flex-shrink-0">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[16px] font-semibold text-white block mb-1">Record Now</span>
                    <p className="text-[13px] text-[#A1A1AA]">Record directly in the app</p>
                  </div>
                </div>
              </button>
            </div>

            {isProcessingUpload && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-[14px] text-[#A1A1AA]">Processing video...</span>
              </div>
            )}

            <button onClick={() => setShowMethodPicker(false)} disabled={isProcessingUpload} className="w-full mt-4 py-3 text-[#A1A1AA] text-[14px] font-medium hover:text-white transition disabled:opacity-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="px-6 py-8 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* BASIC INFO SECTION */}
          {currentSection === 'basic' && (
            <>
              <div>
                <h1 className="text-[28px] font-bold tracking-[-0.02em] mb-2">Tell us about your startup</h1>
                <p className="text-[#A1A1AA] text-[15px]">Start with the essentials</p>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">Logo (optional)</label>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.2)] flex items-center justify-center hover:border-[#6366F1] transition overflow-hidden"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-8 h-8 text-[#71717A]" />
                  )}
                </button>
              </div>

              {/* Startup Name */}
              <div>
                <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">Startup Name *</label>
                <input
                  type="text"
                  name="startup_name"
                  value={formData.startup_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={50}
                  className={`w-full px-4 py-3 bg-[#18181B] border rounded-xl text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#6366F1] transition ${errors.startup_name && touched.startup_name ? 'border-[#EF4444]' : 'border-[rgba(255,255,255,0.1)]'}`}
                  placeholder="e.g., FirstLook"
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.startup_name && touched.startup_name && <span className="text-[12px] text-[#EF4444]">{errors.startup_name}</span>}
                  <span className="text-[12px] text-[#71717A] ml-auto">{formData.startup_name.length}/50</span>
                </div>
              </div>

              {/* One-Liner */}
              <div>
                <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">One-Liner *</label>
                <input
                  type="text"
                  name="one_liner"
                  value={formData.one_liner}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={100}
                  className={`w-full px-4 py-3 bg-[#18181B] border rounded-xl text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#6366F1] transition ${errors.one_liner && touched.one_liner ? 'border-[#EF4444]' : 'border-[rgba(255,255,255,0.1)]'}`}
                  placeholder="Describe your startup in one sentence"
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.one_liner && touched.one_liner && <span className="text-[12px] text-[#EF4444]">{errors.one_liner}</span>}
                  <span className="text-[12px] text-[#71717A] ml-auto">{formData.one_liner.length}/100</span>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl text-white focus:outline-none focus:border-[#6366F1] transition"
                >
                  <option value="AI/ML">AI/ML</option>
                  <option value="SaaS">SaaS</option>
                  <option value="Consumer">Consumer</option>
                  <option value="Fintech">Fintech</option>
                  <option value="Health">Health</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Developer Tools">Developer Tools</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Product Stage */}
              <div>
                <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">Product Stage</label>
                <select
                  name="product_stage"
                  value={formData.product_stage}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl text-white focus:outline-none focus:border-[#6366F1] transition"
                >
                  <option value="MVP">MVP</option>
                  <option value="Beta">Beta</option>
                  <option value="Launched">Launched</option>
                  <option value="Scaling">Scaling</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setCurrentSection('details')}
                className="w-full py-4 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[16px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
              >
                Continue
              </button>
            </>
          )}

          {/* DETAILS SECTION */}
          {currentSection === 'details' && (
            <>
              <div>
                <h1 className="text-[28px] font-bold tracking-[-0.02em] mb-2">More details</h1>
                <p className="text-[#A1A1AA] text-[15px]">Help investors understand your startup better</p>
              </div>

              {/* Team Size */}
              <div>
                <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Team Size
                </label>
                <input
                  type="number"
                  name="team_size"
                  value={formData.team_size}
                  onChange={handleChange}
                  min={1}
                  max={1000}
                  className="w-full px-4 py-3 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl text-white focus:outline-none focus:border-[#6366F1] transition"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#6366F1] transition"
                  placeholder="e.g., San Francisco, CA"
                />
              </div>

              {/* Funding Stage */}
              <div>
                <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Funding Stage
                </label>
                <select
                  name="funding_stage"
                  value={formData.funding_stage}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl text-white focus:outline-none focus:border-[#6366F1] transition"
                >
                  <option value="">Select (optional)</option>
                  <option value="Bootstrapped">Bootstrapped</option>
                  <option value="Pre-seed">Pre-seed</option>
                  <option value="Seed">Seed</option>
                  <option value="Series A">Series A</option>
                  <option value="Series B+">Series B+</option>
                </select>
              </div>

              {/* Funding Amount */}
              {formData.funding_stage && formData.funding_stage !== 'Bootstrapped' && (
                <div>
                  <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">Amount Raised</label>
                  <input
                    type="text"
                    name="funding_amount"
                    value={formData.funding_amount}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#6366F1] transition"
                    placeholder="e.g., $500K, $2M"
                  />
                </div>
              )}

              {/* Traction */}
              <div>
                <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Traction / Key Metric
                </label>
                <input
                  type="text"
                  name="traction_metrics"
                  value={formData.traction_metrics}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#6366F1] transition"
                  placeholder="e.g., 10K users, $50K MRR, 500 DAUs"
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setCurrentSection('basic')} className="flex-1 py-4 bg-[#27272A] text-white text-[16px] font-semibold rounded-xl hover:bg-[#3F3F46] transition">
                  Back
                </button>
                <button type="button" onClick={() => setCurrentSection('links')} className="flex-1 py-4 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[16px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)]">
                  Continue
                </button>
              </div>
            </>
          )}

          {/* LINKS SECTION */}
          {currentSection === 'links' && (
            <>
              <div>
                <h1 className="text-[28px] font-bold tracking-[-0.02em] mb-2">Links & visibility</h1>
                <p className="text-[#A1A1AA] text-[15px]">Add your online presence</p>
              </div>

              {/* Product URL */}
              <div>
                <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">
                  <Globe className="w-4 h-4 inline mr-2" />
                  Product URL
                </label>
                <input
                  type="text"
                  name="product_url"
                  value={formData.product_url}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#6366F1] transition"
                  placeholder="yourproduct.com"
                />
              </div>

              {/* Twitter */}
              <div>
                <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">
                  <Twitter className="w-4 h-4 inline mr-2" />
                  Twitter / X
                </label>
                <input
                  type="text"
                  name="twitter_url"
                  value={formData.twitter_url}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#6366F1] transition"
                  placeholder="https://twitter.com/yourstartup"
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">
                  <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  LinkedIn
                </label>
                <input
                  type="text"
                  name="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#6366F1] transition"
                  placeholder="https://linkedin.com/company/yourstartup"
                />
              </div>

              {/* Privacy Settings */}
              <div className="space-y-4 p-4 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl">
                <h3 className="text-[14px] font-medium text-white">Visibility</h3>
                
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-[14px] text-white">Keep Private</span>
                    <p className="text-[12px] text-[#71717A] mt-0.5">Only you can see this pitch</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.is_private}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_private: e.target.checked, is_pinned: e.target.checked ? false : prev.is_pinned }))}
                    className="w-5 h-5 rounded bg-[#27272A] border-[#3A3A3D] text-[#6366F1] focus:ring-[#6366F1]"
                  />
                </label>

                {!formData.is_private && (
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-[14px] text-white">Pin to Feed</span>
                      <p className="text-[12px] text-[#71717A] mt-0.5">Show at the top of your profile</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.is_pinned}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_pinned: e.target.checked }))}
                      className="w-5 h-5 rounded bg-[#27272A] border-[#3A3A3D] text-[#6366F1] focus:ring-[#6366F1]"
                    />
                  </label>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setCurrentSection('details')} className="flex-1 py-4 bg-[#27272A] text-white text-[16px] font-semibold rounded-xl hover:bg-[#3F3F46] transition">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!isValid}
                  className="flex-1 py-4 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[16px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Pitch
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

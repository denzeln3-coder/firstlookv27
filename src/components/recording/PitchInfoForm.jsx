import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Video, Upload, Smartphone, Info, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import AIScriptGenerator from './AIScriptGenerator';
import AIContentSuggestions from './AIContentSuggestions';
import { compressVideo } from './videoCompressor';

export default function PitchInfoForm({ initialData, onSubmit, onBack, onUploadPitch }) {
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState(initialData || {
    startup_name: '',
    one_liner: '',
    product_url: '',
    category: 'SaaS',
    is_private: false,
    is_pinned: false
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [showScriptGenerator, setShowScriptGenerator] = useState(false);
  const [aiScript, setAiScript] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (formData.startup_name && formData.startup_name.trim()) {
      const expiry = Date.now() + (24 * 60 * 60 * 1000);
      localStorage.setItem('firstlook_pitch_draft', JSON.stringify(formData));
      localStorage.setItem('firstlook_pitch_draft_expiry', expiry.toString());
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
      
      case 'product_url':
        return '';
      
      case 'category':
        if (!value) return 'Category is required';
        return '';
      
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({ startup_name: true, one_liner: true, product_url: true, category: true });
      return false;
    }
    return true;
  };

  const prepareFormData = () => {
    let productUrl = formData.product_url?.trim() || '';
    if (productUrl && !productUrl.match(/^https?:\/\//i)) {
      productUrl = 'https://' + productUrl;
    }
    return { ...formData, product_url: productUrl };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Show method picker instead of going directly to record
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

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('video/')) {
      toast.error('Please upload an MP4, MOV, or WebM video');
      return;
    }

    setIsProcessingUpload(true);
    const loadingToast = toast.loading('Validating video...');

    try {
      // Create blob from file
      let blob = new Blob([file], { type: file.type });
      
      // Check video duration
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

      // Check file size
      const fileSizeMB = blob.size / (1024 * 1024);
      
      if (fileSizeMB > 50) {
        toast.dismiss(loadingToast);
        toast.error('Video too large. Please upload a video under 50MB or use a shorter clip.');
        setIsProcessingUpload(false);
        return;
      }

      // Show warning for large files
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

      // Directly pass blob to parent without intermediate preview
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
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  const isValid = !Object.values(errors).some(e => e) && 
                  formData.startup_name && 
                  formData.one_liner && 
                  formData.category;

  const hasData = Object.values(formData).some(v => v && v !== 'SaaS');

  const handleUseScript = (script) => {
    setAiScript(script);
    setShowScriptGenerator(false);
    setShowSuggestions(true);
  };



  const handleBack = () => {
    if (showScriptGenerator) {
      setShowScriptGenerator(false);
      return;
    }
    
    if (showMethodPicker) {
      setShowMethodPicker(false);
      return;
    }
    
    if (hasData) {
      if (window.confirm('Discard changes? Your progress will be saved as a draft.')) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      {/* Progress */}
      <div className="h-1 bg-[#18181B]">
        <div className="h-full bg-[#6366F1]" style={{ width: '12.5%' }} />
      </div>

      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
        <button onClick={handleBack} className="text-[#A1A1AA] hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-[14px] text-[#71717A]">Step 1 of 8</span>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />



      {/* Method Picker Modal */}
      {showMethodPicker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-[24px] font-bold text-white mb-2">How would you like to create your pitch?</h2>
            <p className="text-[#A1A1AA] text-[14px] mb-6">Choose the best option for you</p>

            <div className="space-y-3">
              {/* Upload Option - Recommended */}
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
                    <p className="text-[13px] text-[#A1A1AA]">
                      Upload a pre-recorded video (up to 100MB, auto-compressed if needed)
                    </p>
                  </div>
                </div>
              </button>

              {/* Record Option */}
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
                    <p className="text-[13px] text-[#A1A1AA]">
                      Record directly in the app with guided prompts
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-[#09090B] rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#6366F1] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] text-[#A1A1AA]">
                    <strong className="text-white">Pro tip:</strong> For best results, record your video using your phone's native camera app, then upload it here. This gives you the highest quality video.
                  </p>
                </div>
              </div>
            </div>

            {/* Processing indicator */}
            {isProcessingUpload && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-[14px] text-[#A1A1AA]">Processing video...</span>
              </div>
            )}

            {/* Cancel */}
            <button
              onClick={() => setShowMethodPicker(false)}
              disabled={isProcessingUpload}
              className="w-full mt-4 py-3 text-[#A1A1AA] text-[14px] font-medium hover:text-white transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <h1 className="text-[32px] font-bold tracking-[-0.02em] mb-2">Tell us about your startup</h1>
        <p className="text-[#A1A1AA] text-[16px] mb-8">We'll use this info to set up your pitch</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Startup Name */}
          <div>
            <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">
              Startup Name *
            </label>
            <input
              type="text"
              name="startup_name"
              value={formData.startup_name}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={50}
              className={`w-full px-4 py-3 bg-[#18181B] border rounded-xl text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#6366F1] transition ${
                errors.startup_name && touched.startup_name ? 'border-[#EF4444]' : 'border-[rgba(255,255,255,0.1)]'
              }`}
              placeholder="e.g., FirstLook"
            />
            <div className="flex justify-between items-center mt-1">
              {errors.startup_name && touched.startup_name && (
                <span className="text-[12px] text-[#EF4444]">{errors.startup_name}</span>
              )}
              <span className="text-[12px] text-[#71717A] ml-auto">{formData.startup_name.length}/50</span>
            </div>
          </div>

          {/* One-Liner */}
          <div>
            <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">
              One-Liner *
            </label>
            <input
              type="text"
              name="one_liner"
              value={formData.one_liner}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={100}
              className={`w-full px-4 py-3 bg-[#18181B] border rounded-xl text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#6366F1] transition ${
                errors.one_liner && touched.one_liner ? 'border-[#EF4444]' : 'border-[rgba(255,255,255,0.1)]'
              }`}
              placeholder="Describe your startup in one sentence"
            />
            <div className="flex justify-between items-center mt-1">
              {errors.one_liner && touched.one_liner && (
                <span className="text-[12px] text-[#EF4444]">{errors.one_liner}</span>
              )}
              <span className="text-[12px] text-[#71717A] ml-auto">{formData.one_liner.length}/100</span>
            </div>
          </div>

          {/* Product URL */}
          <div>
            <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">
              Product URL (optional)
            </label>
            <input
              type="text"
              name="product_url"
              value={formData.product_url}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 bg-[#18181B] border rounded-xl text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#6366F1] transition ${
                errors.product_url && touched.product_url ? 'border-[#EF4444]' : 'border-[rgba(255,255,255,0.1)]'
              }`}
              placeholder="yourproduct.com"
            />
            {errors.product_url && touched.product_url && (
              <span className="text-[12px] text-[#EF4444] mt-1 block">{errors.product_url}</span>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-[14px] font-medium text-[#A1A1AA] mb-2">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              onBlur={handleBlur}
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
                className="w-5 h-5 rounded bg-[#27272A] border-[#3A3A3D] text-[#6366F1] focus:ring-[#6366F1] focus:ring-offset-0"
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
                  className="w-5 h-5 rounded bg-[#27272A] border-[#3A3A3D] text-[#6366F1] focus:ring-[#6366F1] focus:ring-offset-0"
                />
              </label>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isValid}
            className="w-full py-4 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[16px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 mt-8"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
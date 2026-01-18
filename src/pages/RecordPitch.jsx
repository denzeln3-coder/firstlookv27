import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadVideo, uploadThumbnail } from '@/lib/videoUpload';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { generateThumbnail } from '../components/utils/videoUtils';
import { compressVideo } from '../components/recording/videoCompressor';
import { validateVideoBlob } from '../components/recording/videoValidator';
import PitchInfoForm from '../components/recording/PitchInfoForm';
import PitchInstructionsScreen from '../components/recording/PitchInstructionsScreen';
import PitchRecordingScreen from '../components/recording/PitchRecordingScreen';
import PitchPreviewScreen from '../components/recording/PitchPreviewScreen';
import PitchEditScreen from '../components/recording/PitchEditScreen';
import DemoOptionScreen from '../components/recording/DemoOptionScreen';
import DemoInstructionsScreen from '../components/recording/DemoInstructionsScreen';
import DemoRecordingScreen from '../components/recording/DemoRecordingScreen';
import DemoPreviewScreen from '../components/recording/DemoPreviewScreen';
import DemoEditScreen from '../components/recording/DemoEditScreen';
import FinalReviewScreen from '../components/recording/FinalReviewScreen';
import UploadProgress from '../components/recording/UploadProgress';
import SuccessScreen from '../components/recording/SuccessScreen';
import { toast } from 'sonner';

const DRAFT_KEY = 'pitchDraft';

const hasValidDraft = () => {
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (!draft) return false;
    const draftData = JSON.parse(draft);
    return draftData.startup_name && draftData.startup_name.trim().length > 0;
  } catch (e) {
    clearDraft();
    return false;
  }
};

const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY);
  localStorage.removeItem('firstlook_pitch_draft');
};

export default function RecordPitch() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(null);
  const [pitchBlob, setPitchBlob] = useState(null);
  const [demoBlob, setDemoBlob] = useState(null);
  const [recordingType, setRecordingType] = useState('video');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [submittedPitchId, setSubmittedPitchId] = useState(null);
  const [error, setError] = useState(null);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [isUploadedPitch, setIsUploadedPitch] = useState(false);

  useEffect(() => {
    if (step === 1 && hasValidDraft()) {
      try {
        const draft = localStorage.getItem(DRAFT_KEY) || localStorage.getItem('firstlook_pitch_draft');
        const parsed = JSON.parse(draft);
        setFormData(parsed);
        setShowDraftPrompt(true);
      } catch (err) {
        clearDraft();
      }
    }
  }, [step]);

  const handleFormSubmit = (data) => {
    setFormData(data);
    setIsUploadedPitch(false);
    const hidePitchInstructions = localStorage.getItem('hidePitchInstructions');
    setStep(hidePitchInstructions === 'true' ? 3 : 2);
  };

  const handleUploadPitch = async (blob, data) => {
    setUploadStage('Validating video...');
    const validation = await validateVideoBlob(blob);
    
    if (!validation.valid) {
      toast.error(`Video validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    setFormData(data);
    setPitchBlob(blob);
    setIsUploadedPitch(true);
    setStep(4);
  };

  const handleStartPitchRecording = () => setStep(3);

  const handlePitchRecordingComplete = async (blob) => {
    const validation = await validateVideoBlob(blob);
    if (!validation.valid) {
      toast.error(`Video validation failed: ${validation.errors.join(', ')}`);
      return;
    }
    setPitchBlob(blob);
    setStep(4);
  };

  const handlePitchPreviewContinue = () => setStep(4.5);

  const handlePitchEditComplete = (editedBlob) => {
    setPitchBlob(editedBlob);
    setStep(4.7);
  };

  const handlePitchReRecord = () => {
    setPitchBlob(null);
    if (isUploadedPitch) {
      setStep(1);
      setIsUploadedPitch(false);
    } else {
      setStep(3);
    }
  };

  const handleRecordDemoChoice = (type) => {
    setRecordingType(type);
    const hideDemoInstructions = localStorage.getItem('hideDemoInstructions');
    setStep(hideDemoInstructions === 'true' ? 6 : 5);
  };

  const handleUploadDemoChoice = () => setStep(5);
  const handleSkipDemo = () => { setDemoBlob(null); setStep(9); };

  const handleStartDemoRecording = (type) => {
    setRecordingType(type);
    setStep(6);
  };

  const handleDemoRecordingComplete = async (blob) => {
    const validation = await validateVideoBlob(blob);
    if (!validation.valid) {
      toast.error(`Video validation failed: ${validation.errors.join(', ')}`);
      return;
    }
    setDemoBlob(blob);
    setStep(7);
  };

  const handleDemoUploadComplete = async (blob) => {
    const validation = await validateVideoBlob(blob);
    if (!validation.valid) {
      toast.error(`Video validation failed: ${validation.errors.join(', ')}`);
      return;
    }
    setDemoBlob(blob);
    setStep(7);
  };

  const handleDemoPreviewContinue = () => setStep(8);
  const handleDemoReRecord = () => { setDemoBlob(null); setStep(6); };

  const handleDemoEditComplete = (editedBlob) => {
    setDemoBlob(editedBlob);
    setStep(9);
  };

  const handleFinalSubmit = async () => {
    setStep(10);
    
    try {
      setUploadStage('Preparing...');
      setUploadProgress(5);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to submit a pitch');
      }
      
      setUploadProgress(10);
      
      // Generate thumbnail
      setUploadStage('Generating thumbnail...');
      const thumbnailBlob = await generateThumbnail(pitchBlob, 0.5);
      const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
      
      let pitchFile = new File([pitchBlob], 'pitch.mp4', { type: 'video/mp4' });
      let demoFile = null;
      
      const pitchSizeMB = pitchFile.size / (1024 * 1024);
      
      if (demoBlob) {
        demoFile = new File([demoBlob], 'demo.mp4', { type: 'video/mp4' });
      }
      
      if (pitchSizeMB > 45) {
        setUploadStage('Compressing pitch video...');
        const result = await compressVideo(pitchBlob, 45);
        if (result.compressed) {
          pitchFile = new File([result.blob], 'pitch.mp4', { type: 'video/mp4' });
        }
      }
      
      if (demoBlob && demoFile) {
        const demoSizeMB = demoFile.size / (1024 * 1024);
        if (demoSizeMB > 75) {
          setUploadStage('Compressing demo video...');
          const result = await compressVideo(demoBlob, 75);
          if (result.compressed) {
            demoFile = new File([result.blob], 'demo.mp4', { type: 'video/mp4' });
          }
        }
      }
      
      setUploadProgress(20);
      setUploadStage('Uploading videos...');
      
      // Upload pitch video
      const pitchUpload = await uploadVideo(pitchFile, 'pitches');
      setUploadProgress(40);
      
      // Upload demo if exists
      let demoUpload = null;
      if (demoFile) {
        demoUpload = await uploadVideo(demoFile, 'demos');
        setUploadProgress(55);
      }
      
      // Upload thumbnail
      setUploadStage('Uploading thumbnail...');
      const thumbnailUpload = await uploadThumbnail(thumbnailFile);
      setUploadProgress(65);
      
      // Upload logo if exists
      let logoUrl = null;
      if (formData.logoFile) {
        setUploadStage('Uploading logo...');
        const logoFileName = `logos/${user.id}/${Date.now()}-logo.${formData.logoFile.name.split('.').pop()}`;
        const { data: logoData, error: logoError } = await supabase.storage
          .from('startups')
          .upload(logoFileName, formData.logoFile, { cacheControl: '3600', upsert: false });
        
        if (!logoError && logoData) {
          const { data: { publicUrl } } = supabase.storage.from('startups').getPublicUrl(logoFileName);
          logoUrl = publicUrl;
        }
      }
      setUploadProgress(70);
      
      setUploadStage('Creating pitch...');
      
      // Create startup record with all new fields
      const { data: startup, error: startupError } = await supabase
        .from('startups')
        .insert({
          name: formData.startup_name,
          startup_name: formData.startup_name,
          one_liner: formData.one_liner,
          video_url: pitchUpload.url,
          thumbnail_url: thumbnailUpload.url,
          demo_url: demoUpload?.url || null,
          logo_url: logoUrl,
          upvote_count: 0,
          founder_id: user.id,
          product_url: formData.product_url || null,
          category: formData.category,
          product_stage: formData.product_stage || 'MVP',
          team_size: formData.team_size || 1,
          location: formData.location || null,
          funding_stage: formData.funding_stage || null,
          funding_amount: formData.funding_amount || null,
          traction_metrics: formData.traction_metrics || null,
          twitter_url: formData.twitter_url || null,
          linkedin_url: formData.linkedin_url || null,
          website_url: formData.product_url || null,
          review_status: 'approved',
          is_published: formData.is_private !== true,
          is_pinned: formData.is_pinned || false
        })
        .select()
        .single();
      
      if (startupError) {
        throw startupError;
      }
      
      console.log('✅ Startup created successfully:', startup);
      
      setUploadProgress(100);
      setSubmittedPitchId(startup.id);

      clearDraft();
      setStep(11);
      
    } catch (err) {
      console.error('Upload failed:', err);
      setError({
        title: 'Upload failed',
        message: err.message || 'Please check your connection and try again.',
        retry: true
      });
      setStep(9);
    }
  };

  const handleBack = (targetStep) => setStep(targetStep);

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
        <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 max-w-md w-full">
          <h2 className="text-[24px] font-bold text-white mb-3">{error.title}</h2>
          <p className="text-[14px] text-[#A1A1AA] mb-6">{error.message}</p>
          <div className="flex gap-3">
            {error.retry && (
              <button onClick={() => { setError(null); handleFinalSubmit(); }} className="flex-1 py-3 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition">
                Try Again
              </button>
            )}
            <button onClick={() => { setError(null); navigate(createPageUrl('Explore')); }} className="flex-1 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition">
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showDraftPrompt && step === 1) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-8 max-w-md w-full">
          <h3 className="text-white text-[20px] font-bold mb-3">Continue where you left off?</h3>
          <p className="text-[#A1A1AA] text-[14px] mb-4">You have an unfinished pitch for "{formData?.startup_name || 'Untitled'}"</p>
          
          <div className="p-4 bg-[#09090B] border border-[#27272A] rounded-lg mb-6">
            {formData?.startup_name && (
              <div className="flex items-center justify-between text-[13px] mb-2">
                <span className="text-[#71717A]">Startup:</span>
                <span className="text-white font-medium">{formData.startup_name}</span>
              </div>
            )}
            {formData?.category && (
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#71717A]">Category:</span>
                <span className="text-white">{formData.category}</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button onClick={() => { clearDraft(); setFormData(null); setShowDraftPrompt(false); }} className="flex-1 px-6 py-3 bg-[#27272A] text-white text-[14px] font-semibold rounded-xl hover:bg-[#3A3A3D] transition">
              Start Fresh
            </button>
            <button onClick={() => setShowDraftPrompt(false)} className="flex-1 px-6 py-3 bg-[#6366F1] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition">
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  switch (step) {
    case 1:
      return <PitchInfoForm initialData={formData} onSubmit={handleFormSubmit} onUploadPitch={handleUploadPitch} onBack={() => navigate(createPageUrl('Explore'))} />;
    case 2:
      return <PitchInstructionsScreen onStart={handleStartPitchRecording} onBack={() => handleBack(1)} onSkip={null} />;
    case 3:
      return <PitchRecordingScreen onComplete={handlePitchRecordingComplete} onBack={() => handleBack(2)} formData={formData} />;
    case 4:
      return <PitchPreviewScreen videoBlob={pitchBlob} onContinue={handlePitchPreviewContinue} onReRecord={handlePitchReRecord} onBack={() => handleBack(isUploadedPitch ? 1 : 3)} />;
    case 4.5:
      return <PitchEditScreen videoBlob={pitchBlob} onComplete={handlePitchEditComplete} onBack={() => handleBack(4)} />;
    case 4.7:
      return <DemoOptionScreen onRecordDemo={handleRecordDemoChoice} onUploadDemo={handleUploadDemoChoice} onSkipDemo={handleSkipDemo} onBack={() => handleBack(4.5)} />;
    case 5:
      return <DemoInstructionsScreen onStart={handleStartDemoRecording} onBack={() => handleBack(4)} onUploadDemo={handleDemoUploadComplete} />;
    case 6:
      return <DemoRecordingScreen recordingType={recordingType} onComplete={handleDemoRecordingComplete} onBack={() => handleBack(5)} />;
    case 7:
      return <DemoPreviewScreen videoBlob={demoBlob} onContinue={handleDemoPreviewContinue} onReRecord={handleDemoReRecord} onBack={() => handleBack(6)} />;
    case 8:
      return <DemoEditScreen videoBlob={demoBlob} onComplete={handleDemoEditComplete} onBack={() => handleBack(7)} />;
    case 9:
      return <FinalReviewScreen formData={formData} pitchBlob={pitchBlob} demoBlob={demoBlob} onSubmit={handleFinalSubmit} onReRecordPitch={() => handleBack(isUploadedPitch ? 1 : 3)} onReRecordDemo={() => handleBack(demoBlob ? 8 : 4.7)} onSkipDemo={handleSkipDemo} onBack={() => handleBack(demoBlob ? 8 : 4.7)} />;
    case 10:
      return <UploadProgress progress={uploadProgress} stage={uploadStage} />;
    case 11:
      return <SuccessScreen pitchId={submittedPitchId} />;
    default:
      return null;
  }
}

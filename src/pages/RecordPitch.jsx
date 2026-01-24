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
import { Video, ArrowLeft } from 'lucide-react';

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

const STEPS = {
  INFO: 1,
  PITCH_INSTRUCTIONS: 2,
  PITCH_RECORD: 3,
  PITCH_PREVIEW: 4,
  PITCH_EDIT: 4.5,
  DEMO_OPTION: 5,
  DEMO_INSTRUCTIONS: 6,
  DEMO_RECORD: 7,
  DEMO_PREVIEW: 8,
  DEMO_EDIT: 8.5,
  FINAL_REVIEW: 9,
  UPLOADING: 10,
  SUCCESS: 11
};

// Access denied component for non-founders
function FounderAccessRequired({ onBack }) {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-[#6366F1]/20 flex items-center justify-center mx-auto mb-4">
          <Video className="w-8 h-8 text-[#6366F1]" />
        </div>
        <h2 className="text-white text-2xl font-bold mb-3">Founder Access Only</h2>
        <p className="text-[#A1A1AA] mb-6">
          Only founders can record and post pitches. Switch to founder mode in settings to access this feature.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(createPageUrl('Explore'))}
            className="px-6 py-3 bg-[#27272A] text-white font-semibold rounded-xl hover:bg-[#3A3A3D] transition"
          >
            Back to Feed
          </button>
          <button
            onClick={() => navigate(createPageUrl('Settings'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:bg-[#7C7FF2] transition"
          >
            Go to Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecordPitch() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.INFO);
  const [formData, setFormData] = useState(null);
  const [pitchBlob, setPitchBlob] = useState(null);
  const [demoBlob, setDemoBlob] = useState(null);
  const [recordingType, setRecordingType] = useState('screen');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [submittedPitchId, setSubmittedPitchId] = useState(null);
  const [error, setError] = useState(null);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [isUploadedPitch, setIsUploadedPitch] = useState(false);
  
  // Access control state
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [userType, setUserType] = useState(null);

  // Check user access on mount
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Not logged in - redirect to login
          navigate('/login');
          return;
        }
        
        // Get user profile to check user_type
        const { data: profile } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .single();
        
        const type = profile?.user_type;
        setUserType(type);
        
        // Only founders can access RecordPitch
        if (type === 'founder') {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch (err) {
        console.error('Error checking access:', err);
        setHasAccess(false);
      } finally {
        setAccessChecked(true);
      }
    };
    
    checkAccess();
  }, [navigate]);

  // Check for draft on mount (only if has access)
  useEffect(() => {
    if (hasAccess && step === STEPS.INFO && hasValidDraft()) {
      try {
        const draft = localStorage.getItem(DRAFT_KEY) || localStorage.getItem('firstlook_pitch_draft');
        const parsed = JSON.parse(draft);
        setFormData(parsed);
        setShowDraftPrompt(true);
      } catch (err) {
        clearDraft();
      }
    }
  }, [step, hasAccess]);

  // Loading state while checking access
  if (!accessChecked) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-[#6366F1] rounded-full animate-spin" />
      </div>
    );
  }

  // Access denied for non-founders
  if (!hasAccess) {
    return <FounderAccessRequired onBack={() => navigate(createPageUrl('Explore'))} />;
  }

  // Rest of the component (original logic)
  const handleFormSubmit = (data) => {
    setFormData(data);
    setIsUploadedPitch(false);
    const skipInstructions = localStorage.getItem('hidePitchInstructions') === 'true';
    setStep(skipInstructions ? STEPS.PITCH_RECORD : STEPS.PITCH_INSTRUCTIONS);
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
    setStep(STEPS.PITCH_PREVIEW);
  };

  const handleStartPitchRecording = () => setStep(STEPS.PITCH_RECORD);

  const handlePitchRecordingComplete = async (blob) => {
    const validation = await validateVideoBlob(blob);
    if (!validation.valid) {
      toast.error(`Video validation failed: ${validation.errors.join(', ')}`);
      return;
    }
    setPitchBlob(blob);
    setStep(STEPS.PITCH_PREVIEW);
  };

  const handlePitchPreviewContinue = () => setStep(STEPS.PITCH_EDIT);

  const handlePitchEditComplete = (editedBlob) => {
    setPitchBlob(editedBlob);
    setStep(STEPS.DEMO_OPTION);
  };

  const handlePitchReRecord = () => {
    setPitchBlob(null);
    if (isUploadedPitch) {
      setStep(STEPS.INFO);
      setIsUploadedPitch(false);
    } else {
      setStep(STEPS.PITCH_RECORD);
    }
  };

  const handleRecordDemoChoice = (type) => {
    setRecordingType(type || 'screen');
    const skipInstructions = localStorage.getItem('hideDemoInstructions') === 'true';
    setStep(skipInstructions ? STEPS.DEMO_RECORD : STEPS.DEMO_INSTRUCTIONS);
  };

  const handleUploadDemoChoice = () => setStep(STEPS.DEMO_INSTRUCTIONS);
  
  const handleSkipDemo = () => { 
    setDemoBlob(null); 
    setStep(STEPS.FINAL_REVIEW); 
  };

  const handleStartDemoRecording = (type) => {
    setRecordingType(type || 'screen');
    setStep(STEPS.DEMO_RECORD);
  };

  const handleDemoRecordingComplete = async (blob) => {
    const validation = await validateVideoBlob(blob);
    if (!validation.valid) {
      toast.error(`Video validation failed: ${validation.errors.join(', ')}`);
      return;
    }
    setDemoBlob(blob);
    setStep(STEPS.DEMO_PREVIEW);
  };

  const handleDemoUploadComplete = async (blob) => {
    const validation = await validateVideoBlob(blob);
    if (!validation.valid) {
      toast.error(`Video validation failed: ${validation.errors.join(', ')}`);
      return;
    }
    setDemoBlob(blob);
    setStep(STEPS.DEMO_PREVIEW);
  };

  const handleDemoPreviewContinue = () => setStep(STEPS.DEMO_EDIT);
  const handleDemoReRecord = () => { 
    setDemoBlob(null); 
    setStep(STEPS.DEMO_RECORD); 
  };

  const handleDemoEditComplete = (editedBlob) => {
    setDemoBlob(editedBlob);
    setStep(STEPS.FINAL_REVIEW);
  };

  const handleFinalSubmit = async () => {
    setStep(STEPS.UPLOADING);
    
    try {
      setUploadStage('Preparing...');
      setUploadProgress(5);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to submit a pitch');
      }
      
      setUploadProgress(10);
      
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
      setUploadStage('Uploading pitch video...');
      
      const pitchUpload = await uploadVideo(pitchFile, 'pitches');
      setUploadProgress(40);
      
      let demoUpload = null;
      if (demoFile) {
        setUploadStage('Uploading demo video...');
        demoUpload = await uploadVideo(demoFile, 'demos');
        setUploadProgress(55);
      }
      
      setUploadStage('Uploading thumbnail...');
      const thumbnailUpload = await uploadThumbnail(thumbnailFile);
      setUploadProgress(65);
      
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
      
      setUploadStage('Creating your pitch...');
      
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
      setStep(STEPS.SUCCESS);
      
    } catch (err) {
      console.error('Upload failed:', err);
      setError({
        title: 'Upload failed',
        message: err.message || 'Please check your connection and try again.',
        retry: true
      });
      setStep(STEPS.FINAL_REVIEW);
    }
  };

  const handleBack = (targetStep) => setStep(targetStep);

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
        <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 max-w-md w-full">
          <h2 className="text-[24px] font-bold text-white mb-3">{error.title}</h2>
          <p className="text-[14px] text-[#A1A1AA] mb-6">{error.message}</p>
          <div className="flex gap-3">
            {error.retry && (
              <button 
                onClick={() => { setError(null); handleFinalSubmit(); }} 
                className="flex-1 py-3 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition"
              >
                Try Again
              </button>
            )}
            <button 
              onClick={() => { setError(null); navigate(createPageUrl('Explore')); }} 
              className="flex-1 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Draft prompt
  if (showDraftPrompt && step === STEPS.INFO) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-8 max-w-md w-full">
          <h3 className="text-white text-[20px] font-bold mb-3">Continue where you left off?</h3>
          <p className="text-[#A1A1AA] text-[14px] mb-4">
            You have an unfinished pitch for "{formData?.startup_name || 'Untitled'}"
          </p>
          
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
            <button 
              onClick={() => { clearDraft(); setFormData(null); setShowDraftPrompt(false); }} 
              className="flex-1 px-6 py-3 bg-[#27272A] text-white text-[14px] font-semibold rounded-xl hover:bg-[#3A3A3D] transition"
            >
              Start Fresh
            </button>
            <button 
              onClick={() => setShowDraftPrompt(false)} 
              className="flex-1 px-6 py-3 bg-[#6366F1] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main step router
  switch (step) {
    case STEPS.INFO:
      return (
        <PitchInfoForm 
          initialData={formData} 
          onSubmit={handleFormSubmit} 
          onUploadPitch={handleUploadPitch} 
          onBack={() => navigate(createPageUrl('Explore'))} 
        />
      );
    
    case STEPS.PITCH_INSTRUCTIONS:
      return (
        <PitchInstructionsScreen 
          onStart={handleStartPitchRecording} 
          onBack={() => handleBack(STEPS.INFO)} 
          onSkip={handleStartPitchRecording} 
        />
      );
    
    case STEPS.PITCH_RECORD:
      return (
        <PitchRecordingScreen 
          onComplete={handlePitchRecordingComplete} 
          onBack={() => handleBack(STEPS.PITCH_INSTRUCTIONS)} 
          formData={formData} 
        />
      );
    
    case STEPS.PITCH_PREVIEW:
      return (
        <PitchPreviewScreen 
          videoBlob={pitchBlob} 
          onContinue={handlePitchPreviewContinue} 
          onReRecord={handlePitchReRecord} 
          onBack={() => handleBack(isUploadedPitch ? STEPS.INFO : STEPS.PITCH_RECORD)} 
        />
      );
    
    case STEPS.PITCH_EDIT:
      return (
        <PitchEditScreen 
          videoBlob={pitchBlob} 
          onComplete={handlePitchEditComplete} 
          onBack={() => handleBack(STEPS.PITCH_PREVIEW)} 
        />
      );
    
    case STEPS.DEMO_OPTION:
      return (
        <DemoOptionScreen 
          onRecordDemo={handleRecordDemoChoice} 
          onUploadDemo={handleUploadDemoChoice} 
          onSkipDemo={handleSkipDemo} 
          onBack={() => handleBack(STEPS.PITCH_EDIT)} 
        />
      );
    
    case STEPS.DEMO_INSTRUCTIONS:
      return (
        <DemoInstructionsScreen 
          onStart={handleStartDemoRecording} 
          onBack={() => handleBack(STEPS.DEMO_OPTION)} 
          onUploadDemo={handleDemoUploadComplete} 
        />
      );
    
    case STEPS.DEMO_RECORD:
      return (
        <DemoRecordingScreen 
          recordingType={recordingType} 
          onComplete={handleDemoRecordingComplete} 
          onBack={() => handleBack(STEPS.DEMO_INSTRUCTIONS)} 
        />
      );
    
    case STEPS.DEMO_PREVIEW:
      return (
        <DemoPreviewScreen 
          videoBlob={demoBlob} 
          onContinue={handleDemoPreviewContinue} 
          onReRecord={handleDemoReRecord} 
          onBack={() => handleBack(STEPS.DEMO_RECORD)} 
        />
      );
    
    case STEPS.DEMO_EDIT:
      return (
        <DemoEditScreen 
          videoBlob={demoBlob} 
          onComplete={handleDemoEditComplete} 
          onBack={() => handleBack(STEPS.DEMO_PREVIEW)} 
        />
      );
    
    case STEPS.FINAL_REVIEW:
      return (
        <FinalReviewScreen 
          formData={formData} 
          pitchBlob={pitchBlob} 
          demoBlob={demoBlob} 
          onSubmit={handleFinalSubmit} 
          onReRecordPitch={() => handleBack(isUploadedPitch ? STEPS.INFO : STEPS.PITCH_RECORD)} 
          onReRecordDemo={() => handleBack(demoBlob ? STEPS.DEMO_EDIT : STEPS.DEMO_OPTION)} 
          onSkipDemo={handleSkipDemo} 
          onBack={() => handleBack(demoBlob ? STEPS.DEMO_EDIT : STEPS.DEMO_OPTION)} 
        />
      );
    
    case STEPS.UPLOADING:
      return <UploadProgress progress={uploadProgress} stage={uploadStage} />;
    
    case STEPS.SUCCESS:
      return <SuccessScreen pitchId={submittedPitchId} />;
    
    default:
      return null;
  }
}

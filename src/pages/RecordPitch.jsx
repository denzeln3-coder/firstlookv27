import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
const PITCH_VIDEO_KEY = 'pitchVideoBlob';
const DEMO_VIDEO_KEY = 'demoVideoBlob';

const hasValidDraft = () => {
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (!draft) return false;
    
    const draftData = JSON.parse(draft);
    const hasFormData = draftData.startup_name && draftData.startup_name.trim().length > 0;
    
    return hasFormData;
  } catch (e) {
    clearDraft();
    return false;
  }
};

const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY);
  localStorage.removeItem(PITCH_VIDEO_KEY);
  localStorage.removeItem(DEMO_VIDEO_KEY);
};

// Upload helper with automatic retry
const uploadWithRetry = async (file, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await base44.integrations.Core.UploadFile({ file });
    } catch (err) {
      console.warn(`Upload attempt ${attempt} failed:`, err.message);
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
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
        const draft = localStorage.getItem(DRAFT_KEY);
        const parsed = JSON.parse(draft);
        setFormData(parsed);
        setShowDraftPrompt(true);
      } catch (err) {
        clearDraft();
      }
    }
  }, [step]);

  // Step 1: Pitch Info Form - Record flow
  const handleFormSubmit = (data) => {
    setFormData(data);
    setIsUploadedPitch(false);
    const hidePitchInstructions = localStorage.getItem('hidePitchInstructions');
    setStep(hidePitchInstructions === 'true' ? 3 : 2);
  };

  // Step 1: Pitch Info Form - Upload flow
  const handleUploadPitch = async (blob, data) => {
    // Validate video before proceeding
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

  // Step 2: Pitch Instructions
  const handleStartPitchRecording = () => {
    setStep(3);
  };

  // Step 3: Pitch Recording
  const handlePitchRecordingComplete = async (blob) => {
    // Validate recorded video
    const validation = await validateVideoBlob(blob);
    
    if (!validation.valid) {
      toast.error(`Video validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    setPitchBlob(blob);
    setStep(4);
  };

  // Step 4: Pitch Preview
  const handlePitchPreviewContinue = () => {
    setStep(4.5);
  };

  // Step 4.5: Pitch Edit
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

  // Step 4.7: Demo Option
  const handleRecordDemoChoice = (type) => {
    setRecordingType(type);
    const hideDemoInstructions = localStorage.getItem('hideDemoInstructions');
    setStep(hideDemoInstructions === 'true' ? 6 : 5);
  };

  const handleUploadDemoChoice = () => {
    setStep(5);
  };

  const handleSkipDemo = () => {
    setDemoBlob(null);
    setStep(9);
  };

  // Step 5: Demo Instructions
  const handleStartDemoRecording = (type) => {
    setRecordingType(type);
    setStep(6);
  };

  // Step 6: Demo Recording
  const handleDemoRecordingComplete = async (blob) => {
    // Validate demo video
    const validation = await validateVideoBlob(blob);
    
    if (!validation.valid) {
      toast.error(`Video validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    setDemoBlob(blob);
    setStep(7);
  };

  // Handle uploaded demo video
  const handleDemoUploadComplete = async (blob) => {
    const validation = await validateVideoBlob(blob);
    
    if (!validation.valid) {
      toast.error(`Video validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    setDemoBlob(blob);
    setStep(7);
  };

  // Step 7: Demo Preview
  const handleDemoPreviewContinue = () => {
    setStep(8);
  };

  const handleDemoReRecord = () => {
    setDemoBlob(null);
    setStep(6);
  };

  // Step 8: Demo Edit
  const handleDemoEditComplete = (editedBlob) => {
    setDemoBlob(editedBlob);
    setStep(9);
  };

  // Step 9: Final Review & Submit
  const handleFinalSubmit = async () => {
    setStep(10);
    
    try {
      setUploadStage('Preparing...');
      setUploadProgress(5);
      
      const user = await base44.auth.me();
      
      setUploadProgress(10);
      
      // Generate thumbnail
      setUploadStage('Generating thumbnail...');
      const thumbnailBlob = await generateThumbnail(pitchBlob, 0.5);
      const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
      
      // Standardize video format to MP4 for better compatibility
      const pitchMimeType = 'video/mp4';
      
      let pitchFile = new File([pitchBlob], 'pitch.mp4', { type: pitchMimeType });
      let demoFile = null;
      
      // Compress large files
      const pitchSizeMB = pitchFile.size / (1024 * 1024);
      let demoSizeMB = 0;
      
      if (demoBlob) {
        const demoMimeType = 'video/mp4';
        demoFile = new File([demoBlob], 'demo.mp4', { type: demoMimeType });
        demoSizeMB = demoFile.size / (1024 * 1024);
      }
      
      if (pitchSizeMB > 45) {
        setUploadStage('Compressing pitch video...');
        const result = await compressVideo(pitchBlob, 45);
        if (result.compressed) {
          pitchFile = new File([result.blob], 'pitch.mp4', { type: pitchMimeType });
        } else if (result.error) {
          console.warn('Pitch compression failed, uploading original:', result.errorMessage);
          toast.warning('Compression skipped, uploading original video');
        }
      }
      
      if (demoBlob && demoSizeMB > 75) {
        setUploadStage('Compressing demo video...');
        const result = await compressVideo(demoBlob, 75);
        if (result.compressed) {
          demoFile = new File([result.blob], 'demo.mp4', { type: demoMimeType });
        } else if (result.error) {
          console.warn('Demo compression failed, uploading original:', result.errorMessage);
          toast.warning('Compression skipped, uploading original demo');
        }
      }
      
      setUploadProgress(20);
      setUploadStage('Uploading videos...');
      
      // Upload files based on what's available
      const uploadPromises = [
        uploadWithRetry(pitchFile),
        uploadWithRetry(thumbnailFile)
      ];

      if (demoBlob) {
        uploadPromises.splice(1, 0, uploadWithRetry(demoFile));
      }

      const uploadResults = await Promise.all(uploadPromises);
      
      const pitchUploadResult = uploadResults[0];
      const demoUploadResult = demoBlob ? uploadResults[1] : null;
      const thumbnailUploadResult = demoBlob ? uploadResults[2] : uploadResults[1];
      
      setUploadProgress(70);
      setUploadStage('Validating uploads...');
      
      // Validate uploaded videos
      try {
        const validationPromises = [
          base44.functions.invoke('validateVideo', { 
            video_url: pitchUploadResult.file_url 
          })
        ];

        if (demoBlob) {
          validationPromises.push(
            base44.functions.invoke('validateVideo', { 
              video_url: demoUploadResult.file_url 
            })
          );
        }

        const validationResults = await Promise.all(validationPromises);
        
        if (!validationResults[0].data.valid) {
          throw new Error('Pitch validation failed after upload');
        }

        if (demoBlob && !validationResults[1].data.valid) {
          throw new Error('Demo validation failed after upload');
        }
      } catch (validationError) {
        console.warn('Post-upload validation failed:', validationError);
        // Continue anyway - validation is a safety net, not a blocker
      }
      
      setUploadProgress(75);
      setUploadStage('Optimizing videos for mobile...');
      
      // Transcode videos for mobile optimization
      let transcodedPitchUrl = pitchUploadResult.file_url;
      let transcodedDemoUrl = demoUploadResult?.file_url;
      
      try {
        console.log('Starting pitch transcoding...');
        const pitchTranscodeResult = await base44.functions.invoke('transcodeVideo', {
          video_url: pitchUploadResult.file_url,
          pitch_id: 'temp'
        });
        
        if (pitchTranscodeResult.data.success) {
          transcodedPitchUrl = pitchTranscodeResult.data.transcoded_url;
          console.log('✅ Pitch transcoded successfully');
        }

        if (demoBlob && demoUploadResult) {
          console.log('Starting demo transcoding...');
          const demoTranscodeResult = await base44.functions.invoke('transcodeVideo', {
            video_url: demoUploadResult.file_url,
            pitch_id: 'temp'
          });
          
          if (demoTranscodeResult.data.success) {
            transcodedDemoUrl = demoTranscodeResult.data.transcoded_url;
            console.log('✅ Demo transcoded successfully');
          }
        }
      } catch (transcodeError) {
        console.warn('Video transcoding failed, using original videos:', transcodeError);
        // Continue with original videos if transcoding fails - it's an enhancement, not critical
      }
      
      setUploadProgress(80);
      setUploadStage('Creating pitch...');
      
      // Create pitch record with transcoded video URL
      const pitch = await base44.entities.Pitch.create({
        startup_name: formData.startup_name,
        one_liner: formData.one_liner,
        video_url: transcodedPitchUrl,
        thumbnail_url: thumbnailUploadResult.file_url,
        upvote_count: 0,
        founder_id: user.id,
        product_url: formData.product_url,
        category: formData.category,
        review_status: 'approved',
        is_published: formData.is_private === true ? false : true,
        is_pinned: formData.is_pinned === true ? true : false
      });
      
      console.log('✅ Pitch created successfully:', pitch);

      // Create demo record only if demo was provided
      if (demoBlob) {
        await base44.entities.Demo.create({
          pitch_id: pitch.id,
          video_url: transcodedDemoUrl,
          product_url: formData.product_url
        });
      }
      
      setUploadProgress(100);
      setSubmittedPitchId(pitch.id);

      clearDraft();
      setStep(11);
      
    } catch (err) {
      console.error('Upload failed:', err);
      setError({
        title: 'Upload failed',
        message: 'Please check your connection and try again. Your recording is saved - you won\'t lose it.',
        retry: true
      });
      setStep(9);
    }
  };

  const handleBack = (targetStep) => {
    setStep(targetStep);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
        <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 max-w-md w-full">
          <h2 className="text-[24px] font-bold text-white mb-3">{error.title}</h2>
          <p className="text-[14px] text-[#A1A1AA] mb-6">{error.message}</p>
          <div className="flex gap-3">
            {error.retry && (
              <button
                onClick={() => {
                  setError(null);
                  handleFinalSubmit();
                }}
                className="flex-1 py-3 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => {
                setError(null);
                navigate(createPageUrl('Explore'));
              }}
              className="flex-1 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition"
            >
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
              onClick={() => {
                clearDraft();
                setFormData(null);
                setShowDraftPrompt(false);
              }}
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

  switch (step) {
    case 1:
      return (
        <PitchInfoForm
          initialData={formData}
          onSubmit={handleFormSubmit}
          onUploadPitch={handleUploadPitch}
          onBack={() => navigate(createPageUrl('Explore'))}
        />
      );
    
    case 2:
      return (
        <PitchInstructionsScreen
          onStart={handleStartPitchRecording}
          onBack={() => handleBack(1)}
          onSkip={null}
        />
      );
    
    case 3:
      return (
        <PitchRecordingScreen
          onComplete={handlePitchRecordingComplete}
          onBack={() => handleBack(2)}
        />
      );
    
    case 4:
      return (
        <PitchPreviewScreen
          videoBlob={pitchBlob}
          onContinue={handlePitchPreviewContinue}
          onReRecord={handlePitchReRecord}
          onBack={() => handleBack(isUploadedPitch ? 1 : 3)}
        />
      );
    
    case 4.5:
      return (
        <PitchEditScreen
          videoBlob={pitchBlob}
          onComplete={handlePitchEditComplete}
          onBack={() => handleBack(4)}
        />
      );
    
    case 4.7:
      return (
        <DemoOptionScreen
          onRecordDemo={handleRecordDemoChoice}
          onUploadDemo={handleUploadDemoChoice}
          onSkipDemo={handleSkipDemo}
          onBack={() => handleBack(4.5)}
        />
      );
    
    case 5:
      return (
        <DemoInstructionsScreen
          onStart={handleStartDemoRecording}
          onBack={() => handleBack(4)}
          onUploadDemo={handleDemoUploadComplete}
        />
      );
    
    case 6:
      return (
        <DemoRecordingScreen
          recordingType={recordingType}
          onComplete={handleDemoRecordingComplete}
          onBack={() => handleBack(5)}
        />
      );
    
    case 7:
      return (
        <DemoPreviewScreen
          videoBlob={demoBlob}
          onContinue={handleDemoPreviewContinue}
          onReRecord={handleDemoReRecord}
          onBack={() => handleBack(6)}
        />
      );
    
    case 8:
      return (
        <DemoEditScreen
          videoBlob={demoBlob}
          onComplete={handleDemoEditComplete}
          onBack={() => handleBack(7)}
        />
      );

    case 9:
      return (
        <FinalReviewScreen
          formData={formData}
          pitchBlob={pitchBlob}
          demoBlob={demoBlob}
          onSubmit={handleFinalSubmit}
          onReRecordPitch={() => handleBack(isUploadedPitch ? 1 : 3)}
          onReRecordDemo={() => handleBack(demoBlob ? 8 : 4.7)}
          onSkipDemo={handleSkipDemo}
          onBack={() => handleBack(demoBlob ? 8 : 4.7)}
        />
      );

    case 10:
      return (
        <UploadProgress
          progress={uploadProgress}
          stage={uploadStage}
        />
      );

    case 11:
      return (
        <SuccessScreen pitchId={submittedPitchId} />
      );
    
    default:
      return null;
  }
}
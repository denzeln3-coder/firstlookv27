import { supabase } from './supabase';

// Upload video to Supabase Storage
export async function uploadVideo(file, folder = 'pitches', onProgress) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  // Call onProgress with fake milestones since SDK doesn't support real progress
  if (onProgress) onProgress(10);
  
  const { data, error } = await supabase.storage
    .from('videos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (onProgress) onProgress(90);
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(fileName);
  
  if (onProgress) onProgress(100);
  
  return {
    path: data.path,
    url: publicUrl
  };
}

// Upload thumbnail image
export async function uploadThumbnail(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `thumbnails/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('videos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(fileName);
  
  return {
    path: data.path,
    url: publicUrl
  };
}

// Delete video from storage
export async function deleteVideo(path) {
  const { error } = await supabase.storage
    .from('videos')
    .remove([path]);
  
  if (error) throw error;
  return true;
}
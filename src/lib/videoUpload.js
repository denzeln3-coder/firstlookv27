import { supabase } from './supabase';

// Upload video to Supabase Storage with progress tracking
export async function uploadVideo(file, folder = 'pitches', onProgress) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  const { data: { session } } = await supabase.auth.getSession();
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(fileName);
        
        resolve({
          path: fileName,
          url: publicUrl
        });
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    
    const uploadUrl = `${supabaseUrl}/storage/v1/object/videos/${fileName}`;
    
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token || supabaseKey}`);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.send(file);
  });
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
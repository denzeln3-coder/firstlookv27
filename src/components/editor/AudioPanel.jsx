import React from 'react';
import { Music, Volume2 } from 'lucide-react';

const BACKGROUND_MUSIC = [
  { id: 'upbeat1', title: 'Upbeat Energy', duration: 120 },
  { id: 'chill1', title: 'Chill Vibes', duration: 150 },
  { id: 'corporate1', title: 'Corporate Success', duration: 90 },
  { id: 'tech1', title: 'Tech Innovation', duration: 110 }
];

export default function AudioPanel({ project, onUpdate }) {
  const bgMusic = project?.edit_instructions?.background_music;

  const handleSelectMusic = (music) => {
    project.edit_instructions.background_music = {
      audio_asset_id: music.id,
      title: music.title,
      start_time_in_track: 0,
      end_time_in_track: music.duration,
      volume: 0.3,
      fade_in_duration: 2,
      fade_out_duration: 2
    };
    onUpdate();
  };

  const handleVolumeChange = (volume) => {
    if (bgMusic) {
      bgMusic.volume = volume;
      onUpdate();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-white text-sm font-semibold mb-3">Background Music</h4>
        <div className="space-y-2">
          {BACKGROUND_MUSIC.map((music) => (
            <button
              key={music.id}
              onClick={() => handleSelectMusic(music)}
              className={`w-full p-3 rounded-lg border text-left transition ${
                bgMusic?.audio_asset_id === music.id
                  ? 'border-[#6366F1] bg-[#6366F1]/10'
                  : 'border-[#27272A] bg-[#18181B] hover:border-[#3F3F46]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-[#6366F1]" />
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">{music.title}</div>
                  <div className="text-[#636366] text-xs">{music.duration}s</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {bgMusic && (
        <div className="p-3 bg-[#18181B] rounded-lg border border-[#27272A]">
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="w-4 h-4 text-[#6366F1]" />
            <span className="text-white text-sm font-medium">Music Volume</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={bgMusic.volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-[#636366] text-xs w-12">{Math.round(bgMusic.volume * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
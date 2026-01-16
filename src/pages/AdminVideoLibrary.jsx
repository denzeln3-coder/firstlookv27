import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Video, PlayCircle, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function AdminVideoLibrary() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: pitches = [], isLoading } = useQuery({
    queryKey: ['allPitches'],
    queryFn: () => base44.entities.Pitch.list('-created_date')
  });

  const { data: demos = [] } = useQuery({
    queryKey: ['allDemos'],
    queryFn: () => base44.entities.Demo.list('-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-[#A1A1AA] mb-6">Admin access required</p>
          <button
            onClick={() => navigate(createPageUrl('Explore'))}
            className="px-6 py-3 bg-[#6366F1] text-white rounded-lg hover:brightness-110 transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Download started');
    } catch (error) {
      toast.error('Download failed');
      console.error(error);
    }
  };

  const getFounder = (founderId) => {
    return users.find(u => u.id === founderId);
  };

  const filteredPitches = filter === 'all' 
    ? pitches 
    : pitches.filter(p => p.review_status === filter);

  return (
    <div className="min-h-screen bg-[#09090B] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-[#09090B] border-b border-[rgba(255,255,255,0.06)] z-10 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(createPageUrl('Explore'))}
              className="text-[#A1A1AA] hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Video Library</h1>
              <p className="text-[#71717A] text-sm">Download and manage all videos</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{pitches.length}</div>
            <div className="text-[#71717A] text-sm">Total Pitches</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'approved', 'pending', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                filter === f
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-[#18181B] text-[#A1A1AA] hover:bg-[#27272A]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {isLoading ? (
          <div className="text-center py-12 text-[#A1A1AA]">Loading...</div>
        ) : filteredPitches.length === 0 ? (
          <div className="text-center py-12 text-[#A1A1AA]">No pitches found</div>
        ) : (
          <div className="space-y-4">
            {filteredPitches.map((pitch) => {
              const founder = getFounder(pitch.founder_id);
              const demo = demos.find(d => d.pitch_id === pitch.id);
              
              return (
                <div
                  key={pitch.id}
                  className="bg-[#18181B] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 hover:border-[rgba(255,255,255,0.1)] transition"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">{pitch.startup_name}</h3>
                      <p className="text-[#A1A1AA] text-sm mb-2">{pitch.one_liner}</p>
                      <div className="flex items-center gap-4 text-xs text-[#71717A]">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {founder?.email || 'Unknown'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(pitch.created_date).toLocaleDateString()}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          pitch.review_status === 'approved' 
                            ? 'bg-green-500/20 text-green-400'
                            : pitch.review_status === 'rejected'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {pitch.review_status || 'pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Videos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pitch Video */}
                    <div className="bg-[#0A0A0A] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Video className="w-4 h-4 text-[#6366F1]" />
                        <span className="text-sm font-medium">15s Pitch</span>
                      </div>
                      {pitch.video_url ? (
                        <div className="space-y-2">
                          <video
                            src={pitch.video_url}
                            poster={pitch.thumbnail_url}
                            controls
                            className="w-full rounded-lg"
                            style={{ maxHeight: '200px' }}
                          />
                          <button
                            onClick={() => handleDownload(pitch.video_url, `${pitch.startup_name}_pitch.webm`)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#6366F1] hover:brightness-110 text-white text-sm font-medium rounded-lg transition"
                          >
                            <Download className="w-4 h-4" />
                            Download Pitch
                          </button>
                        </div>
                      ) : (
                        <div className="text-[#71717A] text-sm">No video</div>
                      )}
                    </div>

                    {/* Demo Video */}
                    <div className="bg-[#0A0A0A] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <PlayCircle className="w-4 h-4 text-[#8B5CF6]" />
                        <span className="text-sm font-medium">2min Demo</span>
                      </div>
                      {demo?.video_url ? (
                        <div className="space-y-2">
                          <video
                            src={demo.video_url}
                            controls
                            className="w-full rounded-lg"
                            style={{ maxHeight: '200px' }}
                          />
                          <button
                            onClick={() => handleDownload(demo.video_url, `${pitch.startup_name}_demo.webm`)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#8B5CF6] hover:brightness-110 text-white text-sm font-medium rounded-lg transition"
                          >
                            <Download className="w-4 h-4" />
                            Download Demo
                          </button>
                        </div>
                      ) : (
                        <div className="text-[#71717A] text-sm">No demo</div>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  {pitch.product_url && (
                    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                      <div className="text-xs text-[#71717A]">Product URL:</div>
                      <a
                        href={pitch.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#6366F1] hover:brightness-110"
                      >
                        {pitch.product_url}
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
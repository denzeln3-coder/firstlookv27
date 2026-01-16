import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Users, Video, Plus, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function PitchEvents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: events = [] } = useQuery({
    queryKey: ['pitchEvents'],
    queryFn: () => base44.entities.PitchEvent.list('-start_time'),
    refetchInterval: 30000
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['myRegistrations', user?.id],
    queryFn: () => base44.entities.EventRegistration.filter({ user_id: user.id }),
    enabled: !!user
  });

  const upcomingEvents = events.filter(e => e.status === 'upcoming' || e.status === 'live');
  const myEventIds = registrations.map(r => r.event_id);

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl('Explore'))}
            className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white text-xl font-bold">Pitch Events</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#6366F1] text-white text-sm font-semibold rounded-lg hover:brightness-110 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-[#0A0A0A] border border-[#18181B] rounded-xl">
            <Video className="w-5 h-5 text-[#6366F1] mb-2" />
            <div className="text-white text-2xl font-bold">{events.filter(e => e.status === 'live').length}</div>
            <div className="text-[#636366] text-xs">Live Now</div>
          </div>
          <div className="p-4 bg-[#0A0A0A] border border-[#18181B] rounded-xl">
            <Calendar className="w-5 h-5 text-[#6366F1] mb-2" />
            <div className="text-white text-2xl font-bold">{upcomingEvents.length}</div>
            <div className="text-[#636366] text-xs">Upcoming</div>
          </div>
          <div className="p-4 bg-[#0A0A0A] border border-[#18181B] rounded-xl">
            <Users className="w-5 h-5 text-[#6366F1] mb-2" />
            <div className="text-white text-2xl font-bold">{registrations.length}</div>
            <div className="text-[#636366] text-xs">Registered</div>
          </div>
        </div>

        <div className="space-y-4">
          {upcomingEvents.map(event => (
            <button
              key={event.id}
              onClick={() => navigate(createPageUrl('PitchEventDetail') + `?eventId=${event.id}`)}
              className="w-full p-4 bg-[#0A0A0A] border border-[#18181B] rounded-xl hover:border-[#27272A] transition text-left"
            >
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  event.status === 'live' ? 'bg-gradient-to-br from-[#EF4444] to-[#DC2626]' : 'bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]'
                }`}>
                  {event.status === 'live' ? (
                    <Video className="w-8 h-8 text-white" />
                  ) : (
                    <Calendar className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold text-lg">{event.title}</h3>
                    {event.status === 'live' && (
                      <span className="px-2 py-0.5 bg-[#EF4444] text-white text-xs font-bold rounded-full animate-pulse">
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[#8E8E93] text-sm mb-2 line-clamp-2">{event.description}</p>
                  <div className="flex items-center gap-4 text-[#636366] text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(event.start_time).toLocaleDateString()} at {new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {event.registered_count}/{event.max_attendees || '∞'}
                    </div>
                  </div>
                </div>
                {myEventIds.includes(event.id) && (
                  <div className="px-3 py-1 bg-[#22C55E]/20 text-[#22C55E] text-xs font-bold rounded-full">
                    Registered
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
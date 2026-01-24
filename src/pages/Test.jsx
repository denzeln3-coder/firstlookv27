import React from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Test() {
  const navigate = useNavigate();

  const { data: pitches = [], isLoading } = useQuery({
    queryKey: ['pitches'],
    queryFn: async () => {
      const { data } = await supabase.from('startups').select('*').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const handleSelect = (pitch) => {
    console.log('Selected pitch:', pitch);
    console.log('Storing pitch.id:', pitch.id);
    localStorage.setItem('currentPitchId', pitch.id);
    navigate(createPageUrl('Demo'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-3xl font-bold mb-8">Test Page - All Pitches</h1>
      <div className="space-y-4">
        {pitches.map((pitch) => (
          <div key={pitch.id} className="border p-4 rounded flex justify-between items-center">
            <div>
              <div className="font-bold">{pitch.startup_name || pitch.name}</div>
              <div className="text-sm text-gray-600">ID: {pitch.id}</div>
              <div className="text-sm text-gray-500">{pitch.one_liner}</div>
            </div>
            <button onClick={() => handleSelect(pitch)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Select</button>
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowRight, Video, Search, TrendingUp } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();

  useEffect(() => {
    // Only redirect AFTER auth check completes AND user exists
    if (!isLoadingAuth && user) {
      navigate(createPageUrl('Explore'));
    }
  }, [user, isLoadingAuth, navigate]);

  // Show landing page immediately - no loading screen!
  // If user is logged in, they'll be redirected once auth completes
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="relative min-h-screen flex flex-col items-center justify-center px-6 pb-20">
        <div className="mb-12">
          <h1 className="text-4xl font-bold">FirstLook</h1>
        </div>

        <div className="text-center max-w-4xl mx-auto mb-12">
          <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">Discover tomorrow's<br />startups today</h2>
          <p className="text-xl md:text-2xl text-gray-400 mb-12">15-second pitches. 2-minute demos. Zero fluff.</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button onClick={() => navigate(createPageUrl('Explore'))} className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-black transition text-lg">Browse Startups</button>
            <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-8 py-4 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#5558E3] transition text-lg flex items-center justify-center gap-2">Submit Your Pitch<ArrowRight className="w-5 h-5" /></button>
          </div>

          <div className="relative max-w-sm mx-auto">
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl p-4 shadow-2xl border border-gray-700">
              <div className="bg-[#0a0a0a] rounded-2xl overflow-hidden">
                <div className="h-[500px] overflow-hidden">
                  <div className="grid grid-cols-3 gap-0.5 p-0.5">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="aspect-square bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-24 px-6 border-t border-gray-900">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-4xl font-bold text-center mb-16">How it works</h3>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#6366F1] rounded-2xl flex items-center justify-center"><Video className="w-8 h-8 text-white" /></div>
              <h4 className="text-2xl font-bold mb-4">Record</h4>
              <p className="text-gray-400 text-lg">Founders pitch their startup in 15 seconds</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#6366F1] rounded-2xl flex items-center justify-center"><Search className="w-8 h-8 text-white" /></div>
              <h4 className="text-2xl font-bold mb-4">Discover</h4>
              <p className="text-gray-400 text-lg">Early adopters browse and find new products</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#6366F1] rounded-2xl flex items-center justify-center"><TrendingUp className="w-8 h-8 text-white" /></div>
              <h4 className="text-2xl font-bold mb-4">Upvote</h4>
              <p className="text-gray-400 text-lg">The best pitches rise to the top</p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-24 px-6 border-t border-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-4xl font-bold mb-6">Join 100+ founders already pitching</h3>
          <p className="text-xl text-gray-400 mb-8">Be part of the community showcasing the next generation of startups</p>
          <button onClick={() => navigate('/login')} className="px-8 py-4 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#5558E3] transition text-lg">Get Started</button>
        </div>
      </div>

      <footer className="py-12 px-6 border-t border-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-gray-400">Made for founders, by founders</div>
            <div className="flex gap-8 text-gray-400">
              <a href="#" className="hover:text-white transition">About</a>
              <a href="#" className="hover:text-white transition">Twitter</a>
              <a href="#" className="hover:text-white transition">Contact</a>
            </div>
          </div>
          <div className="text-center mt-8 text-gray-500 text-sm">© 2025 FirstLook. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

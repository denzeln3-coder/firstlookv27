import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowLeft, Rocket, DollarSign, Search } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newUserId, setNewUserId] = useState(null);

  const userTypes = [
    { id: 'founder', icon: Rocket, title: 'Founder', description: 'I\'m building a startup and want to showcase my product', color: 'from-[#6366F1] to-[#8B5CF6]', redirect: '/Explore' },
    { id: 'investor', icon: DollarSign, title: 'Investor', description: 'I\'m looking for startups to invest in or advise', color: 'from-[#22C55E] to-[#10B981]', redirect: '/InvestorDashboard' },
    { id: 'hunter', icon: Search, title: 'Hunter', description: 'I discover and try new products before anyone else', color: 'from-[#F59E0B] to-[#EAB308]', redirect: '/Explore' }
  ];

  const getRedirectPath = (userType) => {
    const returnPath = localStorage.getItem('returnPath');
    localStorage.removeItem('returnPath');
    if (returnPath) return returnPath;
    if (userType === 'investor') return '/InvestorDashboard';
    return '/Explore';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: fullName } }
        });
        
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error('Signup failed - no user returned');
        if (data.user.identities?.length === 0) {
          setError('This email is already registered. Please sign in instead.');
          setLoading(false);
          return;
        }
        
        // Check if user profile already exists with user_type
        const { data: existingProfile } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', data.user.id)
          .single();
        
        if (existingProfile?.user_type) {
          await new Promise(resolve => setTimeout(resolve, 300));
          navigate(getRedirectPath(existingProfile.user_type));
          return;
        }
        
        // Create basic profile - with better error handling
        try {
          const { error: upsertError } = await supabase.from('users').upsert({
            id: data.user.id,
            email: email,
            display_name: fullName,
            created_at: new Date().toISOString()
          }, { onConflict: 'id' });
          
          if (upsertError) {
            console.error('Profile creation error:', upsertError);
          }
        } catch (profileErr) {
          console.error('Profile creation failed:', profileErr);
        }
        
        setNewUserId(data.user.id);
        setStep('userType');
        
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (!data.session) throw new Error('Login failed - no session returned');
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const { data: profile } = await supabase.from('users').select('user_type').eq('id', data.user.id).single();
        
        if (!profile?.user_type) {
          setNewUserId(data.user.id);
          setStep('userType');
          return;
        }
        
        navigate(getRedirectPath(profile.user_type));
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserTypeSelect = async (userType) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.from('users').upsert({
        id: newUserId,
        email: email,
        display_name: fullName || null,
        user_type: userType.id,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
      if (error) {
        console.error('Error setting user type:', error);
        throw new Error('Failed to save profile. Please try again.');
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
      navigate(userType.redirect);
    } catch (err) {
      console.error('Error setting user type:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (step === 'userType') {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">
              <span className="text-white">First</span>
              <span className="text-[#6366F1]">Look</span>
            </h1>
            <p className="text-[#8E8E93] mt-2">What brings you here?</p>
          </div>

          <div className="space-y-3">
            {userTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => handleUserTypeSelect(type)}
                  disabled={loading}
                  className="w-full p-4 rounded-xl border-2 border-[#27272A] bg-[#0A0A0A] hover:border-[#6366F1] transition text-left disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">{type.title}</h3>
                      <p className="text-[#A1A1AA] text-sm">{type.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {loading && <p className="text-center mt-4 text-[#8E8E93]">Setting up your account...</p>}

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#8E8E93] hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />Back to Home
        </button>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-white">First</span>
            <span className="text-[#6366F1]">Look</span>
          </h1>
          <p className="text-[#8E8E93] mt-2">{isSignUp ? 'Create your account' : 'Welcome back'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-[#8E8E93] text-sm mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#636366]" />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="w-full pl-11 pr-4 py-3 bg-[#1C1C1E] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" required />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[#8E8E93] text-sm mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#636366]" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full pl-11 pr-4 py-3 bg-[#1C1C1E] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" required />
            </div>
          </div>

          <div>
            <label className="block text-[#8E8E93] text-sm mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#636366]" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-11 pr-4 py-3 bg-[#1C1C1E] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" required minLength={6} />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
          )}

          <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50">
            {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <p className="text-center mt-6 text-[#8E8E93]">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-[#6366F1] hover:underline">
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}

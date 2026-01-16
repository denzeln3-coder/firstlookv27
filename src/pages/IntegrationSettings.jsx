import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Link2, Calendar, MessageSquare, Mail, Video, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function IntegrationSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('crm');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const integrations = [
    {
      id: 'salesforce',
      name: 'Salesforce',
      category: 'crm',
      icon: Briefcase,
      description: 'Sync deal rooms, contacts, and opportunities',
      color: 'from-[#00A1E0] to-[#0077BE]',
      status: 'connected' // Will be dynamic based on OAuth
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      category: 'crm',
      icon: Briefcase,
      description: 'Manage contacts, companies, and deals',
      color: 'from-[#FF7A59] to-[#FF5C35]',
      status: 'connected'
    },
    {
      id: 'googlecalendar',
      name: 'Google Calendar',
      category: 'calendar',
      icon: Calendar,
      description: 'Schedule and sync meetings automatically',
      color: 'from-[#4285F4] to-[#34A853]',
      status: 'connected'
    },
    {
      id: 'slack',
      name: 'Slack',
      category: 'messaging',
      icon: MessageSquare,
      description: 'Get real-time notifications in your workspace',
      color: 'from-[#611F69] to-[#4A154B]',
      status: 'connected'
    }
  ];

  const categories = [
    { id: 'crm', label: 'CRM', icon: Briefcase },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'messaging', label: 'Messaging', icon: MessageSquare },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'video', label: 'Video Analytics', icon: Video }
  ];

  const testIntegration = useMutation({
    mutationFn: async (integrationId) => {
      if (integrationId === 'salesforce' || integrationId === 'hubspot') {
        // Test CRM sync
        const dealRooms = await base44.entities.DealRoom.list();
        if (dealRooms.length === 0) {
          throw new Error('No deal rooms to sync. Create a deal room first.');
        }
        
        await base44.functions.invoke('syncCrmData', {
          crmType: integrationId,
          dealRoomId: dealRooms[0].id,
          action: 'test'
        });
      } else if (integrationId === 'googlecalendar') {
        const meetings = await base44.entities.DealMeeting.list();
        if (meetings.length === 0) {
          throw new Error('No meetings to sync. Schedule a meeting first.');
        }
        
        await base44.functions.invoke('scheduleCalendarMeeting', {
          meetingId: meetings[0].id
        });
      } else if (integrationId === 'slack') {
        await base44.functions.invoke('sendSlackNotification', {
          message: '✅ Integration test successful! FirstLook is now connected to your Slack workspace.',
          title: 'Test Notification',
          type: 'test'
        });
      }
    },
    onSuccess: () => {
      toast.success('Integration test successful!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const filteredIntegrations = integrations.filter(i => i.category === activeTab);

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl('Settings'))}
            className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white text-xl font-bold">Integrations</h1>
          <div className="w-10" />
        </div>

        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  activeTab === cat.id
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#18181B] text-[#8E8E93] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-white text-lg font-semibold mb-2">
            {categories.find(c => c.id === activeTab)?.label} Integrations
          </h2>
          <p className="text-[#8E8E93] text-sm">
            Connect your favorite tools to streamline your workflow
          </p>
        </div>

        <div className="space-y-4">
          {filteredIntegrations.map(integration => {
            const Icon = integration.icon;
            return (
              <div
                key={integration.id}
                className="p-4 bg-[#0A0A0A] border border-[#18181B] rounded-xl hover:border-[#27272A] transition"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">{integration.name}</h3>
                      {integration.status === 'connected' && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-[#22C55E]/20 text-[#22C55E] text-xs font-bold rounded-full">
                          <Check className="w-3 h-3" />
                          Connected
                        </div>
                      )}
                    </div>
                    <p className="text-[#8E8E93] text-sm mb-3">
                      {integration.description}
                    </p>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => testIntegration.mutate(integration.id)}
                        disabled={testIntegration.isPending}
                        className="px-4 py-2 bg-[#18181B] text-white text-sm font-medium rounded-lg hover:bg-[#27272A] transition disabled:opacity-50"
                      >
                        {testIntegration.isPending ? 'Testing...' : 'Test Integration'}
                      </button>
                      
                      {integration.status === 'connected' && (
                        <button className="px-4 py-2 bg-[#EF4444]/20 text-[#EF4444] text-sm font-medium rounded-lg hover:bg-[#EF4444]/30 transition">
                          Disconnect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {activeTab === 'email' && (
            <div className="p-6 bg-[#0A0A0A] border border-[#18181B] rounded-xl">
              <h3 className="text-white font-semibold mb-4">Email Marketing Setup</h3>
              <p className="text-[#8E8E93] text-sm mb-4">
                Configure your email service provider to send automated campaigns
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[#8E8E93] text-sm mb-2">Service Provider</label>
                  <select className="w-full px-4 py-2 bg-[#18181B] text-white rounded-lg border border-[#27272A] focus:outline-none focus:border-[#6366F1]">
                    <option>SendGrid</option>
                    <option>Mailchimp</option>
                    <option>AWS SES</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[#8E8E93] text-sm mb-2">API Key</label>
                  <input
                    type="password"
                    placeholder="Enter your API key"
                    className="w-full px-4 py-2 bg-[#18181B] text-white rounded-lg border border-[#27272A] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
                
                <button className="px-4 py-2 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition">
                  Save Configuration
                </button>
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="p-6 bg-[#0A0A0A] border border-[#18181B] rounded-xl">
              <h3 className="text-white font-semibold mb-4">Video Analytics Setup</h3>
              <p className="text-[#8E8E93] text-sm mb-4">
                Connect your video hosting platform for advanced analytics
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[#8E8E93] text-sm mb-2">Platform</label>
                  <select className="w-full px-4 py-2 bg-[#18181B] text-white rounded-lg border border-[#27272A] focus:outline-none focus:border-[#6366F1]">
                    <option>YouTube Analytics</option>
                    <option>Vimeo</option>
                    <option>Wistia</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[#8E8E93] text-sm mb-2">API Token</label>
                  <input
                    type="password"
                    placeholder="Enter your API token"
                    className="w-full px-4 py-2 bg-[#18181B] text-white rounded-lg border border-[#27272A] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
                
                <button className="px-4 py-2 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition">
                  Save Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
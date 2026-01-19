import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper to convert camelCase to snake_case for table names
const toSnakeCase = (str) => str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');

// Helper to get table name from entity name
const getTableName = (entityName) => {
  const tableMap = {
    'User': 'users',
    'Pitch': 'startups', // Your pitches are in 'startups' table
    'Startup': 'startups',
    'Follow': 'follows',
    'Upvote': 'upvotes',
    'Bookmark': 'bookmarks',
    'Comment': 'comments',
    'PitchView': 'pitch_views',
    'LinkClick': 'link_clicks',
    'Notification': 'notifications',
    'Message': 'messages',
    'DirectMessage': 'direct_messages',
    'Channel': 'channels',
    'ChannelMember': 'channel_members',
    'ChannelMessage': 'channel_messages',
    'Discussion': 'discussions',
    'DiscussionReply': 'discussion_replies',
    'DiscussionUpvote': 'discussion_upvotes',
    'UserTeamMember': 'user_team_members',
    'TeamMember': 'team_members',
    'Investor': 'investors',
    'InvestorAction': 'investor_actions',
    'InvestorFeedback': 'investor_feedback',
    'InvestorMatch': 'investor_matches',
    'InvestorPipeline': 'investor_pipeline',
    'IntroRequest': 'intro_requests',
    'DealRoom': 'deal_rooms',
    'DealRoomMessage': 'deal_room_messages',
    'DealMeeting': 'deal_meetings',
    'Connection': 'connections',
    'Report': 'reports',
    'Subscription': 'subscriptions',
    'BrandKit': 'brand_kits',
    'EditProject': 'edit_projects',
    'VideoAsset': 'video_assets',
    'RenderJob': 'render_jobs',
    'PitchEvent': 'pitch_events',
    'EventRegistration': 'event_registrations',
    'CollaborationRequest': 'collaboration_requests',
    'CollaborationResponse': 'collaboration_responses',
    'TeamInvite': 'team_invites',
    'ForumThread': 'forum_threads',
    'ForumPost': 'forum_posts',
    'EducatorPartner': 'educator_partners',
    'DealFlowAlert': 'deal_flow_alerts',
    'Demo': 'demos',
    'SponsoredContent': 'sponsored_content',
    'Meetup': 'meetups',
    'MeetupAttendee': 'meetup_attendees',
  };
  return tableMap[entityName] || toSnakeCase(entityName) + 's';
};

// Parse sort string (e.g., '-created_date' means descending)
const parseSort = (sortStr) => {
  if (!sortStr) return { column: 'created_at', ascending: false };
  const ascending = !sortStr.startsWith('-');
  const column = sortStr.replace(/^-/, '');
  return { column, ascending };
};

// Create entity handler for a given table
const createEntityHandler = (entityName) => {
  const tableName = getTableName(entityName);
  
  return {
    // List all records
    list: async (sort) => {
      const { column, ascending } = parseSort(sort);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(column, { ascending });
      if (error) throw error;
      return data || [];
    },
    
    // Filter records
    filter: async (filters, sort, limit) => {
      let query = supabase.from(tableName).select('*');
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
      
      // Apply sort
      if (sort) {
        const { column, ascending } = parseSort(sort);
        query = query.order(column, { ascending });
      }
      
      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    
    // Get single record by ID
    get: async (id) => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    
    // Create new record
    create: async (record) => {
      const { data, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    
    // Update record
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    
    // Delete record
    delete: async (id) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    },
    
    // Subscribe to changes (realtime)
    subscribe: (callback) => {
      const channel = supabase
        .channel(`${tableName}_changes`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: tableName },
          (payload) => callback(payload)
        )
        .subscribe();
      
      // Return unsubscribe function
      return () => {
        supabase.removeChannel(channel);
      };
    }
  };
};

// Create a proxy that dynamically creates entity handlers
const entitiesProxy = new Proxy({}, {
  get: (target, entityName) => {
    if (!target[entityName]) {
      target[entityName] = createEntityHandler(entityName);
    }
    return target[entityName];
  }
});

// Auth wrapper
const auth = {
  me: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Get profile from users table
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return { ...user, ...profile };
  },
  
  updateMe: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  isAuthenticated: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  },
  
  redirectToLogin: (redirectTo) => {
    // Store redirect URL and navigate to login
    localStorage.setItem('auth_redirect', redirectTo);
    window.location.href = '/login';
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
  },
  
  getUser: () => supabase.auth.getUser(),
  
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Integrations wrapper (for file uploads, LLM, email, etc.)
const integrations = {
  Core: {
    UploadFile: async ({ file }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);
      
      return { file_url: publicUrl };
    },
    
    InvokeLLM: async ({ prompt, response_json_schema, add_context_from_internet }) => {
      // This would need a serverless function or edge function
      // For now, return a placeholder or call your own API
      console.warn('InvokeLLM called - needs serverless function implementation');
      return { response: 'LLM integration needs to be set up with Supabase Edge Functions' };
    },
    
    SendEmail: async ({ to, subject, body }) => {
      // This would need a serverless function
      console.warn('SendEmail called - needs serverless function implementation');
      return { success: true };
    }
  }
};

// Functions wrapper (for serverless functions)
const functions = {
  invoke: async (functionName, params) => {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: params
    });
    
    if (error) throw error;
    return data;
  }
};

// Main db object that mimics base44
const db = {
  auth,
  entities: entitiesProxy,
  integrations,
  functions,
  // Direct supabase access if needed
  supabase
};

export default db;
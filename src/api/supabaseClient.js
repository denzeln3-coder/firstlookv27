import { supabase } from '../lib/supabase'; 

// Helper: Add timeout to any promise
const withTimeout = (promise, ms = 30000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms)
    )
  ]);
};

// Auth wrapper (mimics base44.auth)
export const auth = {
  async me() {
    const { data: { user }, error } = await withTimeout(supabase.auth.getUser());
    if (error || !user) return null;
    
    // Get profile data
    const { data: profile } = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
    );
    
    return profile ? { ...user, ...profile } : user;
  },
  
  async isAuthenticated() {
    const { data: { user } } = await withTimeout(supabase.auth.getUser());
    return !!user;
  },
  
  redirectToLogin(returnPath = '/') {
    // Store return path and redirect to login
    localStorage.setItem('returnPath', returnPath);
    window.location.href = '/login';
  },
  
  async signOut() {
    await withTimeout(supabase.auth.signOut());
    window.location.href = '/';
  }
};

// Entities wrapper (mimics base44.entities)
export const entities = {
  Pitch: {
    async list(orderBy = '-created_at') {
      const isDesc = orderBy.startsWith('-');
      const column = orderBy.replace('-', '');
      
      const { data, error } = await withTimeout(
        supabase
          .from('startups')
          .select('*')
          .order(column, { ascending: !isDesc })
      );
      
      if (error) throw error;
      return data || [];
    },
    
    async filter(filters) {
      let query = supabase.from('startups').select('*');
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error } = await withTimeout(query);
      if (error) throw error;
      return data || [];
    },
    
    async get(id) {
      const { data, error } = await withTimeout(
        supabase
          .from('startups')
          .select('*')
          .eq('id', id)
          .single()
      );
      
      if (error) throw error;
      return data;
    },
    
    async create(record) {
      const { data, error } = await withTimeout(
        supabase
          .from('startups')
          .insert(record)
          .select()
          .single()
      );
      
      if (error) throw error;
      return data;
    },
    
    async update(id, updates) {
      const { data, error } = await withTimeout(
        supabase
          .from('startups')
          .update(updates)
          .eq('id', id)
          .select()
          .single()
      );
      
      if (error) throw error;
      return data;
    },
    
    async delete(id) {
      const { error } = await withTimeout(
        supabase
          .from('startups')
          .delete()
          .eq('id', id)
      );
      
      if (error) throw error;
    }
  },
  
  // Generic entity creator for other tables
  createEntity(tableName) {
    return {
      async list(orderBy = '-created_at') {
        const isDesc = orderBy.startsWith('-');
        const column = orderBy.replace('-', '');
        
        const { data, error } = await withTimeout(
          supabase
            .from(tableName)
            .select('*')
            .order(column, { ascending: !isDesc })
        );
        
        if (error) throw error;
        return data || [];
      },
      
      async filter(filters) {
        let query = supabase.from(tableName).select('*');
        
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        const { data, error } = await withTimeout(query);
        if (error) throw error;
        return data || [];
      },
      
      async get(id) {
        const { data, error } = await withTimeout(
          supabase
            .from(tableName)
            .select('*')
            .eq('id', id)
            .single()
        );
        
        if (error) throw error;
        return data;
      },
      
      async create(record) {
        const { data, error } = await withTimeout(
          supabase
            .from(tableName)
            .insert(record)
            .select()
            .single()
        );
        
        if (error) throw error;
        return data;
      },
      
      async update(id, updates) {
        const { data, error } = await withTimeout(
          supabase
            .from(tableName)
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        );
        
        if (error) throw error;
        return data;
      },
      
      async delete(id) {
        const { error } = await withTimeout(
          supabase
            .from(tableName)
            .delete()
            .eq('id', id)
        );
        
        if (error) throw error;
      }
    };
  }
};

// Add common entities
entities.Profile = entities.createEntity('profiles');
entities.Follow = entities.createEntity('follows');
entities.Message = entities.createEntity('messages');
entities.Upvote = entities.createEntity('upvotes');
entities.Comment = entities.createEntity('comments');
entities.SponsoredContent = entities.createEntity('sponsored_content');
entities.InvestorAction = entities.createEntity('investor_actions');
entities.Notification = entities.createEntity('notifications');

// Functions wrapper (for serverless functions - placeholder for now)
export const functions = {
  async invoke(functionName, params) {
    console.log(`Function ${functionName} called with:`, params);
    // TODO: Implement edge functions later
    return null;
  }
};

// Main export (mimics base44 object)
export const db = {
  auth,
  entities,
  functions
};

export default db;

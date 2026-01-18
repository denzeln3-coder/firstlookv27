// Redirect all base44 calls to Supabase
import db from './supabaseClient';

export const base44 = db;
export default db;

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { database } from './firebase';
import { ref, get } from 'firebase/database';

// Type for user Supabase credentials
interface UserSupabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
  userID: string;
}

// Cache for Supabase clients to avoid recreating
const supabaseClients = new Map<string, SupabaseClient>();

/**
 * Get user-specific Supabase credentials from Firebase Realtime Database
 * @param userId - User ID who is logged in
 * @returns Promise<UserSupabaseConfig>
 */
export async function getUserSupabaseConfig(userId: string): Promise<UserSupabaseConfig> {
  try {
    console.log('Fetching Supabase config for user:', userId);
    
    // Reference to user's Supabase config in Firebase
    const userConfigRef = ref(database, `user/${userId}`);
    const snapshot = await get(userConfigRef);
    
    if (!snapshot.exists()) {
      throw new Error(`No Supabase configuration found for user: ${userId}`);
    }
    
    const userData = snapshot.val();
    console.log('User data from Firebase:', userData);
    
    // Validate required fields
    if (!userData.supabaseUrl || !userData.supabaseKey) {
      throw new Error(`Incomplete Supabase configuration for user: ${userId}`);
    }
    
    return {
      supabaseUrl: userData.supabaseUrl,
      supabaseKey: userData.supabaseKey,
      userID: userData.userID || userId
    };
  } catch (error) {
    console.error('Error fetching user Supabase config:', error);
    throw error;
  }
}

/**
 * Create or get cached Supabase client for specific user
 * @param userId - User ID who is logged in
 * @returns Promise<SupabaseClient>
 */
export async function getUserSupabaseClient(userId: string) {
  try {
    // Check if client already exists in cache
    if (supabaseClients.has(userId)) {
      console.log('Using cached Supabase client for user:', userId);
      return supabaseClients.get(userId);
    }
    
    // Fetch user-specific config
    const config = await getUserSupabaseConfig(userId);
    
    // Create new Supabase client
    const supabaseClient = createClient(config.supabaseUrl, config.supabaseKey);
    
    // Cache the client
    supabaseClients.set(userId, supabaseClient);
    
    console.log('Created new Supabase client for user:', userId);
    console.log('Supabase URL:', config.supabaseUrl);
    console.log('User ID:', config.userID);
    
    return supabaseClient;
  } catch (error) {
    console.error('Error creating user Supabase client:', error);
    throw error;
  }
}

/**
 * Clear cached Supabase client (useful on logout)
 * @param userId - User ID
 */
export function clearUserSupabaseClient(userId: string) {
  supabaseClients.delete(userId);
  console.log('Cleared Supabase client cache for user:', userId);
}

/**
 * Test connection to user's Supabase database
 * @param userId - User ID
 * @returns Promise<boolean>
 */
export async function testUserSupabaseConnection(userId: string): Promise<boolean> {
  try {
    const client = await getUserSupabaseClient(userId);
    
    if (!client) {
      console.error('Failed to get Supabase client');
      return false;
    }
    
    // Test connection by trying to fetch from a common table
    const { error } = await client
      .from('courses')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection test successful for user:', userId);
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

/**
 * Get all user IDs with Supabase configurations
 * @returns Promise<string[]>
 */
export async function getAllUserIds(): Promise<string[]> {
  try {
    const usersRef = ref(database, 'user');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const users = snapshot.val();
    return Object.keys(users);
  } catch (error) {
    console.error('Error fetching user IDs:', error);
    return [];
  }
}

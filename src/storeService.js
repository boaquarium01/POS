import { supabase } from './supabase'

export async function fetchStores() {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching stores:', error);
    return [];
  }
  return data;
}
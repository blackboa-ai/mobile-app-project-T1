import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://lawascode.negd.in/laac-api/v1';

export type Law = {
  id: string;
  apiSlug: string;
  title: string;
  year: number;
  category: string;
  authority: string;
  status: string;
  sections: number;
};

export type Provision = {
  number: string;
  title: string;
  text: string;
};

const LAWS_CACHE_KEY = '@nyaykosh_laws';
const PROVISIONS_CACHE_PREFIX = '@nyaykosh_provisions_';

export async function fetchLaws(query?: string): Promise<Law[]> {
  let url = `${BASE_URL}/laws`;
  if (query) {
    url += `?q=${encodeURIComponent(query)}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch laws: ${res.status}`);
    const data = await res.json();
    const laws = Array.isArray(data) ? data : data.data || [];
    
    // Save to cache on success
    await AsyncStorage.setItem(LAWS_CACHE_KEY, JSON.stringify(laws));
    return laws;
  } catch (error) {
    console.warn('API failed, trying cache...', error);
    // If API fails, try to load from cache
    const cached = await AsyncStorage.getItem(LAWS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    throw error; // Re-throw if no cache is available
  }
}

export async function fetchLawProvisions(slug: string): Promise<Provision[]> {
  const cacheKey = `${PROVISIONS_CACHE_PREFIX}${slug}`;

  try {
    const res = await fetch(`${BASE_URL}/laws/${slug}/provisions`);
    if (!res.ok) throw new Error(`Failed to fetch provisions: ${res.status}`);
    const data = await res.json();
    const provisions = Array.isArray(data) ? data : data.data || [];
    
    // Save to cache on success
    await AsyncStorage.setItem(cacheKey, JSON.stringify(provisions));
    return provisions;
  } catch (error) {
    console.warn(`API failed for ${slug}, trying cache...`, error);
    // If API fails, try to load from cache
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    throw error; // Re-throw if no cache is available
  }
}
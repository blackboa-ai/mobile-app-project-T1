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

  // Create an AbortController to enforce an 8-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`Failed to fetch laws: ${res.status}`);
    const data = await res.json();
    const laws = Array.isArray(data) ? data : data.data || [];
    
    await AsyncStorage.setItem(LAWS_CACHE_KEY, JSON.stringify(laws));
    return laws;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('API failed or timed out, trying cache...', error);
    
    const cached = await AsyncStorage.getItem(LAWS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    throw new Error('No internet and no cached laws available.');
  }
}

export async function fetchLawProvisions(slug: string): Promise<Provision[]> {
  const cacheKey = `${PROVISIONS_CACHE_PREFIX}${slug}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${BASE_URL}/laws/${slug}/provisions`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`Failed to fetch provisions: ${res.status}`);
    const data = await res.json();
    const provisions = Array.isArray(data) ? data : data.data || [];
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(provisions));
    return provisions;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn(`API failed or timed out for ${slug}, trying cache...`, error);
    
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    throw new Error('No internet and no cached sections available.');
  }
}
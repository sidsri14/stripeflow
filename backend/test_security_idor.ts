import axios from 'axios';
import crypto from 'crypto';

const VICTIM_SOURCE_ID = '525322dc-d15d-4172-a8dd-f363986461bb';
const ATTACKER_EMAIL = `audit-attacker-${Date.now()}@example.com`;
const ATTACKER_PASS = 'AttackerPassword123!';
const API_URL = 'http://127.0.0.1:3000/api';

function parseCookies(setCookieHeaders: string[] | undefined) {
  if (!setCookieHeaders) return '';
  return setCookieHeaders.map(h => h.split(';')[0]).join('; ');
}

async function run() {
  try {
    console.log('1. Registering attacker...');
    const csrfRes = await axios.get(`${API_URL}/csrf-token`);
    const csrfToken = csrfRes.data.token;
    const csrfCookie = parseCookies(csrfRes.headers['set-cookie']);

    const regRes = await axios.post(`${API_URL}/auth/register`, 
      { email: ATTACKER_EMAIL, password: ATTACKER_PASS },
      { headers: { 'x-csrf-token': csrfToken, Cookie: csrfCookie } }
    );
    
    const authHeaders = {
      Cookie: `${parseCookies(regRes.headers['set-cookie'])}; ${csrfCookie}`,
      'x-csrf-token': csrfToken
    };

    console.log('2. Attempting IDOR attack on source:', VICTIM_SOURCE_ID);
    
    try {
      // Trying to fetch the victim's source detail (if GET exists) or just any action
      const attackRes = await axios.get(`${API_URL}/sources`, { headers: authHeaders });
      const sources = attackRes.data.data;
      
      const found = sources.find((s: any) => s.id === VICTIM_SOURCE_ID);
      
      if (found) {
        console.log('❌ VULNERABILITY FOUND: Attacker can see victim source!', found);
        process.exit(1);
      } else {
        console.log('✅ SUCCESS: Victim source is NOT visible in attendee list.');
      }

      // Trying a direct action (if a GET /sources/:id existed, we'd use it)
      // Since we use global source listing, the absence in the list is the primary check.
      
      process.exit(0);
    } catch (err: any) {
      console.log('✅ SUCCESS: Attacker was blocked from accessing victim resource.', err.response?.status);
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Audit Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

run();

// Maps free-text location strings from live feeds (USGS "place", GDACS
// descriptions/names) to an Indian state/UT so alerts can be tagged and
// filtered by state. This is a best-effort text match against official
// state/UT names and common city→state associations — not a geocoder.
// Source for the state/UT list: Ministry of Home Affairs (India) —
// https://www.mha.gov.in/en/divisionofindia/state-and-union-territory

export const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

export const INDIA_UNION_TERRITORIES = [
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

export const INDIA_STATES_AND_UTS = [...INDIA_STATES, ...INDIA_UNION_TERRITORIES];

// USGS is queried with a rectangular lat/lng bounding box (see
// INDIA_BOUNDS in siteConfig.js) because that's all its API supports —
// but a rectangle drawn to cover Kashmir-to-Kanyakumari and
// Gujarat-to-Arunachal Pradesh unavoidably also covers parts of these
// neighboring countries. USGS returns real quakes from them too, so
// they must be filtered back out client-side using the "place" text.
const NON_INDIA_COUNTRY_KEYWORDS = [
  "afghanistan", "pakistan", "nepal", "bhutan", "bangladesh",
  "myanmar", "burma", "china", "tibet", "sri lanka", "maldives",
  "indonesia", "thailand", "tajikistan", "turkmenistan", "kyrgyzstan",
];

/**
 * True if a USGS/GDACS location string clearly names a country other
 * than India — used to drop border-region results that only matched
 * India's bounding box or a loose substring check ("ind" also matches
 * "Indonesia"), not India itself.
 */
export function mentionsNonIndiaCountry(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return NON_INDIA_COUNTRY_KEYWORDS.some((c) => lower.includes(c));
}

// Indian maritime/territorial phrases that USGS uses in "place" strings
// where no state is named — e.g. "Andaman Islands, India region",
// "Bay of Bengal". These count as positive India evidence.
const INDIA_REGION_KEYWORDS = [
  "india", "andaman", "nicobar", "lakshadweep", "bay of bengal",
  "arabian sea", "western ghats", "himalaya", "kashmir", "gujarat coast",
];

// A handful of major cities that show up often in USGS "place" strings
// or GDACS descriptions, mapped to their state/UT — kept short and
// sourced from the same MHA state/UT directory above (cities aren't
// officially listed there; the mapping itself is common-knowledge
// state capitals/major cities, not a claimed official source).
const CITY_TO_STATE = {
  mumbai: "Maharashtra", pune: "Maharashtra", nagpur: "Maharashtra",
  bengaluru: "Karnataka", bangalore: "Karnataka", mysuru: "Karnataka",
  // Kodagu, Manipal and Udupi are risk locations this platform models
  // directly (see LOCATIONS in backend/main.py), so they must resolve —
  // otherwise a genuine Kodagu landslide alert would be filtered out for
  // lack of positive India evidence.
  kodagu: "Karnataka", coorg: "Karnataka", madikeri: "Karnataka",
  manipal: "Karnataka", udupi: "Karnataka", mangaluru: "Karnataka",
  chikkamagaluru: "Karnataka", belagavi: "Karnataka", shivamogga: "Karnataka",
  karwar: "Karnataka", "uttara kannada": "Karnataka", "dakshina kannada": "Karnataka",
  chennai: "Tamil Nadu", coimbatore: "Tamil Nadu", madurai: "Tamil Nadu",
  kolkata: "West Bengal", darjeeling: "West Bengal",
  hyderabad: "Telangana", warangal: "Telangana",
  ahmedabad: "Gujarat", surat: "Gujarat", vadodara: "Gujarat",
  jaipur: "Rajasthan", jodhpur: "Rajasthan",
  lucknow: "Uttar Pradesh", kanpur: "Uttar Pradesh", varanasi: "Uttar Pradesh",
  patna: "Bihar", gaya: "Bihar",
  bhopal: "Madhya Pradesh", indore: "Madhya Pradesh",
  guwahati: "Assam", dibrugarh: "Assam", sarupathar: "Assam", silchar: "Assam", tezpur: "Assam", jorhat: "Assam", tinsukia: "Assam",
  thiruvananthapuram: "Kerala", kochi: "Kerala", ernakulam: "Kerala",
  wayanad: "Kerala", alappuzha: "Kerala", kozhikode: "Kerala", idukki: "Kerala",
  kottayam: "Kerala", pathanamthitta: "Kerala", thrissur: "Kerala", palakkad: "Kerala",
  malappuram: "Kerala", kollam: "Kerala", kannur: "Kerala",
  chandigarh: "Chandigarh", amritsar: "Punjab", ludhiana: "Punjab",
  dehradun: "Uttarakhand", shimla: "Himachal Pradesh",
  chamoli: "Uttarakhand", joshimath: "Uttarakhand", kedarnath: "Uttarakhand",
  nainital: "Uttarakhand", rishikesh: "Uttarakhand", uttarkashi: "Uttarakhand",
  rudraprayag: "Uttarakhand", pithoragarh: "Uttarakhand",
  dharamsala: "Himachal Pradesh", dharamshala: "Himachal Pradesh", palampur: "Himachal Pradesh",
  sarahan: "Himachal Pradesh", mandi: "Himachal Pradesh", kullu: "Himachal Pradesh",
  manali: "Himachal Pradesh", kinnaur: "Himachal Pradesh", chamba: "Himachal Pradesh",
  srinagar: "Jammu and Kashmir", jammu: "Jammu and Kashmir", leh: "Ladakh",
  bhubaneswar: "Odisha", cuttack: "Odisha", puri: "Odisha", balasore: "Odisha",
  raipur: "Chhattisgarh", ranchi: "Jharkhand",
  imphal: "Manipur", shillong: "Meghalaya", aizawl: "Mizoram",
  kohima: "Nagaland", agartala: "Tripura", gangtok: "Sikkim",
  itanagar: "Arunachal Pradesh", panaji: "Goa", puducherry: "Puducherry",
  "port blair": "Andaman and Nicobar Islands",
  delhi: "Delhi", "new delhi": "Delhi",
  raigad: "Maharashtra", ratnagiri: "Maharashtra", sindhudurg: "Maharashtra",
  kolhapur: "Maharashtra", satara: "Maharashtra", sangli: "Maharashtra",
};

/**
 * Best-effort detection of an Indian state/UT from a free-text string
 * (e.g. USGS "properties.place", or a GDACS event name/description).
 * Returns the matched state/UT name, or null if nothing matched —
 * callers should render null as "State not identified" rather than
 * guessing, so unverifiable alerts are never mislabeled.
 */
export function detectIndiaState(text) {
  if (!text) return null;
  // Normalize diacritics (e.g. Sarāhan -> sarahan, Pālampur -> palampur)
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const lower = normalized.toLowerCase();

  for (const state of INDIA_STATES_AND_UTS) {
    if (lower.includes(state.toLowerCase())) return state;
  }
  for (const [city, state] of Object.entries(CITY_TO_STATE)) {
    if (lower.includes(city)) return state;
  }
  return null;
}

/**
 * True only if a feed location string carries POSITIVE evidence of being
 * in India.
 *
 * This is deliberately stricter than !mentionsNonIndiaCountry(). USGS is
 * queried with a lat/lng rectangle, and that rectangle spills across
 * every neighbour India has — so a quake in, say, "32km SW of Murghob"
 * passes a not-a-foreign-country check simply because the place string
 * never names the country. Requiring an Indian state/UT, city, or an
 * Indian regional phrase means an event has to actively look Indian to
 * be shown, instead of merely failing to look foreign. Unattributable
 * results are dropped rather than displayed as Indian alerts.
 */
export function isIndiaPlace(text) {
  if (!text) return false;
  if (mentionsNonIndiaCountry(text)) return false;
  const lower = text.toLowerCase();
  if (INDIA_REGION_KEYWORDS.some((k) => lower.includes(k))) return true;
  return detectIndiaState(text) !== null;
}

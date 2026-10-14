/**
 * CareerPulse AI - System Constants & Tamil Nadu Domain Data
 * Defines valid districts, reservation categories, and system-wide enums.
 */

// All 38 Tamil Nadu Official Districts
export const TN_DISTRICTS = [
  'Ariyalur',
  'Chengalpattu',
  'Chennai',
  'Coimbatore',
  'Cuddalore',
  'Dharmapuri',
  'Dindigul',
  'Erode',
  'Kallakurichi',
  'Kanchipuram',
  'Kanyakumari',
  'Karur',
  'Krishnagiri',
  'Madurai',
  'Mayiladuthurai',
  'Nagapattinam',
  'Namakkal',
  'Nilgiris',
  'Perambalur',
  'Pudukkottai',
  'Ramanathapuram',
  'Ranipet',
  'Salem',
  'Sivaganga',
  'Tenkasi',
  'Thanjavur',
  'Theni',
  'Thoothukudi',
  'Tiruchirappalli',
  'Tirunelveli',
  'Tirupathur',
  'Tiruppur',
  'Tiruvallur',
  'Tiruvannamalai',
  'Tiruvarur',
  'Vellore',
  'Viluppuram',
  'Virudhunagar'
];

// Tamil Nadu Reservation Categories
export const RESERVATION_CATEGORIES = [
  'OC',   // Open Competition
  'BC',   // Backward Class
  'BCM',  // Backward Class Muslim
  'MBC',  // Most Backward Class / DNC
  'SC',   // Scheduled Caste
  'SCA',  // Scheduled Caste Arunthathiyar
  'ST'    // Scheduled Tribe
];

// User roles
export const USER_ROLES = ['student', 'admin'];

// Admission Streams after 12th
export const STREAMS = [
  'Engineering',
  'Medical',
  'Commerce',
  'Arts',
  'Science',
  'Vocational'
];

// Cutoff Chance Labels
export const CHANCE_LABELS = {
  HIGH: 'High Chance',
  GOOD: 'Good',
  MODERATE: 'Moderate',
  BORDERLINE: 'Borderline',
  LOW: 'Low Chance'
};

// 12th Career Guide Options
export const CAREER_GUIDE_OPTIONS = [
  'NEET',
  'Without NEET',
  'JEE',
  'Without JEE',
  'Engineering Stream',
  'Medical Stream',
  'Commerce Stream',
  'Arts & Science Stream'
];

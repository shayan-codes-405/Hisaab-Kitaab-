/**
 * Official GST Council List of Indian States & Union Territories
 * Includes official 2-digit GST state codes.
 */
export const INDIAN_STATES = [
  { code: '01', name: 'Jammu and Kashmir', type: 'UT' },
  { code: '02', name: 'Himachal Pradesh', type: 'State' },
  { code: '03', name: 'Punjab', type: 'State' },
  { code: '04', name: 'Chandigarh', type: 'UT' },
  { code: '05', name: 'Uttarakhand', type: 'State' },
  { code: '06', name: 'Haryana', type: 'State' },
  { code: '07', name: 'Delhi', type: 'UT' },
  { code: '08', name: 'Rajasthan', type: 'State' },
  { code: '09', name: 'Uttar Pradesh', type: 'State' },
  { code: '10', name: 'Bihar', type: 'State' },
  { code: '11', name: 'Sikkim', type: 'State' },
  { code: '12', name: 'Arunachal Pradesh', type: 'State' },
  { code: '13', name: 'Nagaland', type: 'State' },
  { code: '14', name: 'Manipur', type: 'State' },
  { code: '15', name: 'Mizoram', type: 'State' },
  { code: '16', name: 'Tripura', type: 'State' },
  { code: '17', name: 'Meghalaya', type: 'State' },
  { code: '18', name: 'Assam', type: 'State' },
  { code: '19', name: 'West Bengal', type: 'State' },
  { code: '20', name: 'Jharkhand', type: 'State' },
  { code: '21', name: 'Odisha', type: 'State' },
  { code: '22', name: 'Chhattisgarh', type: 'State' },
  { code: '23', name: 'Madhya Pradesh', type: 'State' },
  { code: '24', name: 'Gujarat', type: 'State' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu', type: 'UT' },
  { code: '27', name: 'Maharashtra', type: 'State' },
  { code: '28', name: 'Andhra Pradesh', type: 'State' },
  { code: '29', name: 'Karnataka', type: 'State' },
  { code: '30', name: 'Goa', type: 'State' },
  { code: '31', name: 'Lakshadweep', type: 'UT' },
  { code: '32', name: 'Kerala', type: 'State' },
  { code: '33', name: 'Tamil Nadu', type: 'State' },
  { code: '34', name: 'Puducherry', type: 'UT' },
  { code: '35', name: 'Andaman and Nicobar Islands', type: 'UT' },
  { code: '36', name: 'Telangana', type: 'State' },
  { code: '37', name: 'Andhra Pradesh (New)', type: 'State' },
  { code: '38', name: 'Ladakh', type: 'UT' }
];

export const STATES_LIST = INDIAN_STATES.filter((s) => s.type === 'State');
export const UT_LIST = INDIAN_STATES.filter((s) => s.type === 'UT');


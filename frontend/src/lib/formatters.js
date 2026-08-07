/**
 * Raqamlarni probel bilan formatlash (masalan 1 200 000 yoki 1 200.5)
 */
export const formatNumberInput = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  
  // Raqam bo'lmagan barcha narsalarni olib tashlaymiz (faqat raqam, nuqta va minus qoladi)
  let cleanStr = value.toString().replace(/[^\d.-]/g, '');
  
  if (!cleanStr) return '';

  // Nuqta bilan ajratamiz (kasr qismi uchun)
  const parts = cleanStr.split('.');
  
  // Butun qismini 3 tadan probel bilan ajratamiz
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  
  // Agar nuqta yozilgan bo'lsa uni ham qo'shib qaytaramiz
  return parts.join('.');
};

/**
 * Formatlangan raqamdan probellarni olib tashlab, sof raqam ko'rinishiga qaytarish
 * (Ma'lumotlar bazasiga saqlash uchun)
 */
export const parseNumberInput = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  return value.toString().replace(/\s/g, '');
};

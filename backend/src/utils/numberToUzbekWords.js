/**
 * Converts integer numbers into Uzbek currency words format.
 * Example: 350000 -> "Uch yuz ellik ming so'm"
 */

const ONES = [
  "", "bir", "ikki", "uch", "to'rt", "besh",
  "olti", "yetti", "sakkiz", "to'qqiz"
];

const TENS = [
  "", "o'n", "yigirma", "o'ttiz", "qirq", "ellik",
  "oltmish", "yetmish", "sakson", "to'qson"
];

function convertThreeDigits(num) {
  let res = [];
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;
  const tens = Math.floor(remainder / 10);
  const ones = remainder % 10;

  if (hundreds > 0) {
    res.push(ONES[hundreds] + " yuz");
  }

  if (tens > 0) {
    res.push(TENS[tens]);
  }

  if (ones > 0) {
    res.push(ONES[ones]);
  }

  return res.join(" ");
}

function numberToUzbekWords(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return "Nol so'm";
  }

  const n = Math.floor(Math.abs(Number(num)));
  if (n === 0) return "Nol so'm";

  const billions = Math.floor(n / 1000000000);
  const millions = Math.floor((n % 1000000000) / 1000000);
  const thousands = Math.floor((n % 1000000) / 1000);
  const units = n % 1000;

  let parts = [];

  if (billions > 0) {
    parts.push(convertThreeDigits(billions) + " milliard");
  }

  if (millions > 0) {
    parts.push(convertThreeDigits(millions) + " million");
  }

  if (thousands > 0) {
    parts.push(convertThreeDigits(thousands) + " ming");
  }

  if (units > 0) {
    parts.push(convertThreeDigits(units));
  }

  let text = parts.join(" ").trim();
  if (!text) return "Nol so'm";

  // Capitalize first letter and append "so'm"
  text = text.charAt(0).toUpperCase() + text.slice(1) + " so'm";
  return text;
}

module.exports = {
  numberToUzbekWords
};

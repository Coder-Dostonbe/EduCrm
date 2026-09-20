/** Deterministic PRNG so mock data is identical on server and client. */
export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rnd: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

export function randInt(rnd: () => number, min: number, max: number): number {
  return Math.floor(rnd() * (max - min + 1)) + min;
}

export const maleFirstNames = [
  "Jasur", "Bekzod", "Sardor", "Ulug'bek", "Aziz", "Doston", "Shohruh",
  "Javohir", "Otabek", "Temur", "Farrukh", "Sanjar", "Bobur", "Diyor",
  "Islom", "Kamron", "Murod", "Nodir", "Rustam", "Suhrob", "Abror",
  "Akmal", "Alisher", "Anvar", "Asror", "Behruz", "Davron", "Elyor",
] as const;

export const femaleFirstNames = [
  "Aziza", "Dilnoza", "Gulnora", "Kamola", "Laylo", "Madina", "Nilufar",
  "Nodira", "Ozoda", "Rayhona", "Sevara", "Shahzoda", "Umida", "Zarina",
  "Zilola", "Dildora", "Feruza", "Gavhar", "Iroda", "Jamila", "Malika",
  "Mohira", "Nafisa", "Nigora", "Sabina", "Shirin", "Yulduz", "Zebo",
] as const;

export const lastNamesMale = [
  "Karimov", "Rahimov", "Toshmatov", "Yusupov", "Aliyev", "Ergashev",
  "Ismoilov", "Nazarov", "Qodirov", "Sattorov", "Tursunov", "Umarov",
  "Xolmatov", "Yo'ldoshev", "Abdullayev", "Berdiyev", "G'ofurov",
  "Hakimov", "Jo'rayev", "Mirzayev", "Olimov", "Po'latov", "Rasulov",
  "Sobirov", "Sharipov",
] as const;

export const lastNamesFemale = [
  "Karimova", "Rahimova", "Toshmatova", "Yusupova", "Aliyeva", "Ergasheva",
  "Ismoilova", "Nazarova", "Qodirova", "Sattorova", "Tursunova", "Umarova",
  "Xolmatova", "Yo'ldosheva", "Abdullayeva", "Berdiyeva", "G'ofurova",
  "Hakimova", "Jo'rayeva", "Mirzayeva", "Olimova", "Po'latova", "Rasulova",
  "Sobirova", "Sharipova",
] as const;

export const tashkentAddresses = [
  "Chilonzor tumani, Bunyodkor ko'chasi 12",
  "Yunusobod tumani, Amir Temur shoh ko'chasi 45",
  "Mirzo Ulug'bek tumani, Buyuk Ipak Yo'li 78",
  "Shayxontohur tumani, Navoiy ko'chasi 23",
  "Yakkasaroy tumani, Bobur ko'chasi 8",
  "Olmazor tumani, Ziyolilar ko'chasi 15",
  "Uchtepa tumani, Farhod ko'chasi 31",
  "Sergeli tumani, Yangi Sergeli 5-mavze",
  "Mirobod tumani, Oybek ko'chasi 51",
  "Bektemir tumani, Ohangaron yo'li 3",
] as const;

export function uzPhone(rnd: () => number): string {
  const codes = ["90", "91", "93", "94", "95", "97", "98", "99", "33", "88"];
  const code = pick(rnd, codes);
  const n = () => randInt(rnd, 0, 9);
  return `+998${code}${n()}${n()}${n()}${n()}${n()}${n()}${n()}`;
}

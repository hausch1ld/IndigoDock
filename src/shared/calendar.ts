export function monthDays(year: number, month: number) {
  const first = new Date(year, month, 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0, 12).getDate();
  const cells = Math.ceil((offset + count) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => {
    const day = i - offset + 1;
    return day > 0 && day <= count ? day : null;
  });
}

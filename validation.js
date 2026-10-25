const sanitizeText = (str) => {
    if (!str) return null;
    return String(str).replace(/<[^>]*>/g, '').trim();
};
const isValidPositiveInt = val => Number.isInteger(Number(val)) && Number(val) > 0;
const isValidPhone = phone => /^(?:\+94|0)[0-9]{9}$/.test(String(phone).trim());
const isValidEmail = email => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(email).trim());
const isValidDate = dateStr => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const d = new Date(dateStr);
    return d instanceof Date && !isNaN(d.getTime());
};
const isValidTime = timeStr => /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/.test(String(timeStr).trim());
module.exports = {sanitizeText,isValidPositiveInt,isValidPhone,isValidEmail,isValidDate,isValidTime};

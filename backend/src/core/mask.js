const maskEmail = (
    e = '') => e.replace(/^(.).*(@.*)$/, '$1***$2');

const maskMobile = (
    m = '') => m.replace(/^(\+\d{2} \d{2}) .*(\d{4})$/, '$1 *** $2');

    
module.exports = { maskEmail, maskMobile };
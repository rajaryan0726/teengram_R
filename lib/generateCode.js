/**
 * Generates a verification code in the format TG-{TYPE}-{RANDOM}
 * @param {string} type - The institution type (e.g., SCH, COL, UNI)
 * @returns {string} The generated code
 */
export const generateVerificationCode = (type) => {
    // Generate an 6-character random alphanumeric string (capital letters and numbers)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Map full type to shorthand
    let typeShort = 'INS';
    const typeUpper = type ? type.toUpperCase() : '';
    if (typeUpper.includes('SCHOOL')) typeShort = 'SCH';
    else if (typeUpper.includes('COLLEGE')) typeShort = 'COL';
    else if (typeUpper.includes('UNIVERSITY')) typeShort = 'UNI';
    else if (typeUpper.includes('COACHING')) typeShort = 'CCH';
    
    return `TG-${typeShort}-${randomPart}`;
};

/**
 * Validation Utilities
 * Form and input validation logic
 */

export const Validation = {
  /**
   * Validate login form
   */
  validateLogin(email, password) {
    const errors = [];
    
    if (!email || !Sanitizer.isValidEmail(email)) {
      errors.push('Please enter a valid email address.');
    }
    
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters.');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate registration step 1
   */
  validateRegistrationStep1(email, industryCode) {
    const errors = [];
    
    if (!email || !Sanitizer.isValidEmail(email)) {
      errors.push('Please enter a valid email address.');
    }
    
    if (!industryCode || !Sanitizer.isValidIndustryCode(industryCode)) {
      errors.push('Industry code must be 6 characters (letters and numbers).');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate registration step 3
   */
  validateRegistrationStep3(password, password2, name) {
    const errors = [];
    
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters.');
    }
    
    if (password !== password2) {
      errors.push('Passwords do not match.');
    }
    
    if (!name || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters.');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate setup/profile form
   */
  validateProfile(name, productName) {
    const errors = [];
    
    if (!name || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters.');
    }
    
    if (!productName || productName.trim().length < 2) {
      errors.push('Product name must be at least 2 characters.');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate industry code creation
   */
  validateIndustryCodeCreation(industryName, productName, specifications) {
    const errors = [];
    
    if (!industryName || industryName.trim().length < 2) {
      errors.push('Industry name is required.');
    }
    
    if (!productName || productName.trim().length < 2) {
      errors.push('Product name is required.');
    }
    
    if (Object.keys(specifications).length === 0) {
      errors.push('At least one specification is required.');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
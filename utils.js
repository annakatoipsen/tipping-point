export function validateInput(value, type, min = null, max = null) {
  if (value === null || value === undefined || value === '') {
    return { valid: false, message: 'Value is required' };
  }

  const numValue = parseFloat(value);
  
  if (type === 'number') {
    if (isNaN(numValue)) {
      return { valid: false, message: 'Must be a valid number' };
    }
    
    if (min !== null && numValue < min) {
      return { valid: false, message: `Must be at least ${min}` };
    }
    
    if (max !== null && numValue > max) {
      return { valid: false, message: `Must be at most ${max}` };
    }
  }
  
  return { valid: true, value: numValue };
}

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export function formatPercent(rate) {
  return `${rate}%`;
}

export function getValidatedInput(prompt, type = 'number', min = null, max = null, readlineSync) {
  while (true) {
    const input = readlineSync.question(`${prompt}: `);
    const validation = validateInput(input, type, min, max);
    
    if (validation.valid) {
      return validation.value;
    }
    
    console.log(`❌ ${validation.message}`);
  }
}
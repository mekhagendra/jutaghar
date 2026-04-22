let counter = 0;

const toAlphabetString = (value, alphabet, size) => {
  const base = alphabet.length;
  let current = value;
  let out = '';

  for (let i = 0; i < size; i += 1) {
    out = alphabet[current % base] + out;
    current = Math.floor(current / base);
  }

  return out;
};

const customAlphabet = (alphabet, size) => {
  return () => {
    counter += 1;
    return toAlphabetString(counter, alphabet, size);
  };
};

module.exports = { customAlphabet };

export function uuid () {
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  return template.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = (c === 'x' ? r : (r & 0x3 | 0x8))
    return v.toString(16)
  })
}

export function uuid32encode (value) {
  const encoded = Array.from(value.replace(/-/g, ''), (character) => parseInt(
    character, 16).toString(2).padStart(4, '0')).join('')

  return encoded.padStart(130, '1').match(/.{5}/g).map(
    binary => alphabet[parseInt(binary, 2)]).join('')
}

export function uuid32decode (value) {
  const decoded = Array.from(value, (character) => alphabet.indexOf(
    character).toString(2).padStart(5, '0')).join('')

  return decoded.slice(2).match(/.{4}/g).map(
    binary => parseInt(binary, 2).toString(16)).join('').replace(
    /(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5')
}

const alphabet = [
  '0', '1', '2', '3', '4', '5', '6', '7',
  '8', '9', 'a', 'b', 'c', 'd', 'e', 'f',
  'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
  'o', 'p', 'q', 'r', 's', 't', 'u', 'v'
]

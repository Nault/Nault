import { Injectable } from '@angular/core';
import * as blake from 'blakejs';
import {BigNumber} from 'bignumber.js'

const nacl = window['nacl'];

@Injectable()
export class UtilService {

  constructor() {
  }

  hex = {
    toUint4: hexToUint4,
    fromUint8: uint8ToHex,
    toUint8: hexToUint8,
  };
  uint4 = {
    toUint5: uint4ToUint5,
    toUint8: uint4ToUint8,
  };
  uint5 = {
    toString: uint5ToString,
  };
  uint8 = {
    toUint4: uint8ToUint4,
    fromHex: hexToUint8,
    toHex: uint8ToHex,
  };
  dec = {
    toHex: decToHex,
  };
  account = {
    generateAccountSecretKeyBytes: generateAccountSecretKeyBytes,
    generateAccountKeyPair: generateAccountKeyPair,
    getPublicAccountID: getPublicAccountID,
    generateSeedBytes: generateSeedBytes,
    getAccountPublicKey: getAccountPublicKey,
  };
  nano = {
    mnanoToRaw: mnanoToRaw,
    knanoToRaw: knanoToRaw,
    nanoToRaw: nanoToRaw,
    rawToMnano: rawToMnano,
    rawToKnano: rawToKnano,
    rawToNano: rawToNano,
  };

}



/** Hex Functions **/
function hexToUint4(hexValue) {
  const uint4 = new Uint8Array(hexValue.length);
  for (let i = 0; i < hexValue.length; i++) uint4[i] = parseInt(hexValue.substr(i, 1), 16);

  return uint4;
}
function hexToUint8(hexValue) {
  const length = (hexValue.length / 2) | 0;
  const uint8 = new Uint8Array(length);
  for (let i = 0; i < length; i++) uint8[i] = parseInt(hexValue.substr(i * 2, 2), 16);

  return uint8;
}


/** Uint4 Functions **/
function uint4ToUint8(uintValue) {
  const length = uintValue.length / 2;
  const uint8 = new Uint8Array(length);
  for (let i = 0; i < length; i++)	uint8[i] = uintValue[i*2] * 16 + uintValue[i*2+1];

  return uint8;
}

function uint4ToUint5(uintValue) {
  var length = uintValue.length / 5 * 4;
  var uint5 = new Uint8Array(length);
  for (let i = 1; i <= length; i++) {
    let n = i - 1;
    let m = i % 4;
    let z = n + ((i - m)/4);
    let right = uintValue[z] << m;
    let left;
    if (((length - i) % 4) == 0)	left = uintValue[z-1] << 4;
    else	left = uintValue[z+1] >> (4 - m);
    uint5[n] = (left + right) % 32;
  }
  return uint5;
}

function uint4ToHex(uint4) {
  var hex = "";
  for (let i = 0; i < uint4.length; i++) hex += uint4[i].toString(16).toUpperCase();
  return hex;
}


/** Uint5 Functions **/
function uint5ToString(uint5) {
  const letter_list = '13456789abcdefghijkmnopqrstuwxyz'.split('');
  let string = "";
  for (let i = 0; i < uint5.length; i++)	string += letter_list[uint5[i]];

  return string;
}

function uint5ToUint4(uint5) {
  var length = uint5.length / 4 * 5;
  var uint4 = new Uint8Array(length);
  for (let i = 1; i <= length; i++) {
    let n = i - 1;
    let m = i % 5;
    let z = n - ((i - m)/5);
    let right = uint5[z-1] << (5 - m);
    let left = uint5[z] >> m;
    uint4[n] = (left + right) % 16;
  }
  return uint4;
}


/** Uint8 Functions **/
function uint8ToHex(uintValue) {
  let hex = "";
  let aux;
  for (let i = 0; i < uintValue.length; i++) {
    aux = uintValue[i].toString(16).toUpperCase();
    if(aux.length == 1)
      aux = '0'+aux;
    hex += aux;
    aux = '';
  }

  return(hex);
}

function uint8ToUint4(uintValue) {
  const uint4 = new Uint8Array(uintValue.length * 2);
  for (let i = 0; i < uintValue.length; i++) {
    uint4[i*2] = uintValue[i] / 16 | 0;
    uint4[i*2+1] = uintValue[i] % 16;
  }

  return uint4;
}


/** Dec Functions **/
function decToHex(decValue, bytes = null) {
  var dec = decValue.toString().split(''), sum = [], hex = '', hexArray = [], i, s
  while(dec.length) {
    s = 1 * dec.shift()
    for(i = 0; s || i < sum.length; i++)
    {
      s += (sum[i] || 0) * 10
      sum[i] = s % 16
      s = (s - sum[i]) / 16
    }
  }
  while(sum.length) {
    hexArray.push(sum.pop().toString(16));
  }

  hex = hexArray.join('');

  if(hex.length % 2 != 0)
    hex = "0" + hex;

  if(bytes > hex.length / 2) {
    var diff = bytes - hex.length / 2;
    for(var j = 0; j < diff; j++)
      hex = "00" + hex;
  }

  return hex;
}


/** String Functions **/
function stringToUint5(string) {
  var letter_list = letter_list = '13456789abcdefghijkmnopqrstuwxyz'.split('');
  var length = string.length;
  var string_array = string.split('');
  var uint5 = new Uint8Array(length);
  for (let i = 0; i < length; i++)	uint5[i] = letter_list.indexOf(string_array[i]);
  return uint5;
}


/** Account Functions **/
function generateAccountSecretKeyBytes(seedBytes, accountIndex) {
  const accountBytes = hexToUint8(decToHex(accountIndex, 4));
  const context = blake.blake2bInit(32);
  blake.blake2bUpdate(context, seedBytes);
  blake.blake2bUpdate(context, accountBytes);
  const newKey = blake.blake2bFinal(context);

  return newKey;
}

function generateAccountKeyPair(accountSecretKeyBytes) {
  return nacl.sign.keyPair.fromSecretKey(accountSecretKeyBytes);
}

function getPublicAccountID(accountPublicKeyBytes) {
  const accountHex = util.uint8.toHex(accountPublicKeyBytes);
  const keyBytes = util.uint4.toUint8(util.hex.toUint4(accountHex)); // For some reason here we go from u, to hex, to 4, to 8??
  const checksum = util.uint5.toString(util.uint4.toUint5(util.uint8.toUint4(blake.blake2b(keyBytes, null, 5).reverse())));
  const account = util.uint5.toString(util.uint4.toUint5(util.hex.toUint4(`0${accountHex}`)));

  return `xrb_${account}${checksum}`;
}

function getAccountPublicKey(account) {
  if ((!account.startsWith('xrb_1') && !account.startsWith('xrb_3')) || account.length !== 64) throw new Error(`Invalid XRB Account`);
  const account_crop = account.substring(4,64);
  const isValid = /^[13456789abcdefghijkmnopqrstuwxyz]+$/.test(account_crop);
  if (!isValid) throw new Error(`Invalid XRB account`);

  const key_uint4 = array_crop(uint5ToUint4(stringToUint5(account_crop.substring(0, 52))));
  const hash_uint4 = uint5ToUint4(stringToUint5(account_crop.substring(52, 60)));
  const key_array = uint4ToUint8(key_uint4);
  const blake_hash = blake.blake2b(key_array, null, 5).reverse();

  if (!equal_arrays(hash_uint4, uint8ToUint4(blake_hash))) throw new Error(`Incorrect checksum`);

  return uint4ToHex(key_uint4);
}

/**
 * Conversion functions
 */
const mnano = 1000000000000000000000000000000;
const knano = 1000000000000000000000000000;
const nano  = 1000000000000000000000000;
function mnanoToRaw(value) {
  return new BigNumber(value).times(mnano);
}
function knanoToRaw(value) {
  return new BigNumber(value).times(knano);
}
function nanoToRaw(value) {
  return new BigNumber(value).times(nano);
}
function rawToMnano(value) {
  return new BigNumber(value).div(mnano);
}
function rawToKnano(value) {
  return new BigNumber(value).div(knano);
}
function rawToNano(value) {
  return new BigNumber(value).div(nano);
}




function array_crop (array) {
  var length = array.length - 1;
  var cropped_array = new Uint8Array(length);
  for (let i = 0; i < length; i++)
    cropped_array[i] = array[i+1];
  return cropped_array;
}

function equal_arrays (array1, array2) {
  for (let i = 0; i < array1.length; i++) {
    if (array1[i] != array2[i])	return false;
  }
  return true;
}


function generateSeedBytes() {
  return nacl.randomBytes(32);
}

const util = {
  hex: {
    toUint4: hexToUint4,
    fromUint8: uint8ToHex,
    toUint8: hexToUint8,
  },
  uint4: {
    toUint5: uint4ToUint5,
    toUint8: uint4ToUint8,
  },
  uint5: {
    toString: uint5ToString,
  },
  uint8: {
    toUint4: uint8ToUint4,
    fromHex: hexToUint8,
    toHex: uint8ToHex,
  },
  dec: {
    toHex: decToHex,
  },
  account: {
    generateAccountSecretKeyBytes: generateAccountSecretKeyBytes,
    generateAccountKeyPair: generateAccountKeyPair,
    getPublicAccountID: getPublicAccountID,
    generateSeedBytes: generateSeedBytes,
    getAccountPublicKey: getAccountPublicKey,
  },
  nano: {
    mnanoToRaw: mnanoToRaw,
    knanoToRaw: knanoToRaw,
    nanoToRaw: nanoToRaw,
    rawToMnano: rawToMnano,
    rawToKnano: rawToKnano,
    rawToNano: rawToNano,
  }
};

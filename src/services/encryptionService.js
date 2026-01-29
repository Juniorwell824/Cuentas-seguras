import CryptoJS from 'crypto-js';

class EncryptionService {
  // Generar una clave derivada de la contraseña del usuario usando PBKDF2
  static generateKeyFromPassword(password, salt) {
    // PBKDF2 es un algoritmo de derivación de clave más seguro
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 10000
    }).toString();
  }

  // Generar un salt único
  static generateSalt() {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }

  // Encriptar datos con una clave específica
  static encryptDataWithKey(data, key) {
    try {
      return CryptoJS.AES.encrypt(data, key).toString();
    } catch (error) {
      console.error('Error al encriptar:', error);
      throw error;
    }
  }

  // Desencriptar datos con una clave específica
  static decryptDataWithKey(encryptedData, key) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Clave de desencriptación incorrecta');
      }
      
      return decrypted;
    } catch (error) {
      console.error('Error al desencriptar:', error);
      throw error;
    }
  }

  // Versión simplificada para uso inmediato (mantener compatibilidad)
  static encryptData(data, userId) {
    try {
      // En producción, esto debería usar una clave más segura
      const userKey = CryptoJS.SHA256(userId + 'clave-secreta-app').toString();
      return this.encryptDataWithKey(data, userKey);
    } catch (error) {
      console.error('Error en encriptación simplificada:', error);
      return data;
    }
  }

  static decryptData(encryptedData, userId) {
    try {
      const userKey = CryptoJS.SHA256(userId + 'clave-secreta-app').toString();
      return this.decryptDataWithKey(encryptedData, userKey);
    } catch (error) {
      console.error('Error en desencriptación simplificada:', error);
      return encryptedData;
    }
  }

  // Encriptar objeto completo
  static encryptObject(obj, userId, fieldsToEncrypt = []) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const encryptedObj = { ...obj };
    
    fieldsToEncrypt.forEach(field => {
      if (encryptedObj[field] && typeof encryptedObj[field] === 'string') {
        encryptedObj[field] = this.encryptData(encryptedObj[field], userId);
      }
    });
    
    return encryptedObj;
  }

  // Desencriptar objeto completo
  static decryptObject(obj, userId, fieldsToDecrypt = []) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const decryptedObj = { ...obj };
    
    fieldsToDecrypt.forEach(field => {
      if (decryptedObj[field] && typeof decryptedObj[field] === 'string') {
        decryptedObj[field] = this.decryptData(decryptedObj[field], userId);
      }
    });
    
    return decryptedObj;
  }
}

export default EncryptionService;
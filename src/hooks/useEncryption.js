import { useCallback } from 'react';
import EncryptionService from '../services/encryptionService';

const useEncryption = (userId) => {
  const encrypt = useCallback((data) => {
    if (!userId || !data) return data;
    return EncryptionService.encryptData(data, userId);
  }, [userId]);

  const decrypt = useCallback((encryptedData) => {
    if (!userId || !encryptedData) return encryptedData;
    return EncryptionService.decryptData(encryptedData, userId);
  }, [userId]);

  const encryptObject = useCallback((obj, fieldsToEncrypt = []) => {
    if (!userId || !obj) return obj;
    return EncryptionService.encryptObject(obj, userId, fieldsToEncrypt);
  }, [userId]);

  const decryptObject = useCallback((obj, fieldsToDecrypt = []) => {
    if (!userId || !obj) return obj;
    return EncryptionService.decryptObject(obj, userId, fieldsToDecrypt);
  }, [userId]);

  return {
    encrypt,
    decrypt,
    encryptObject,
    decryptObject
  };
};

export default useEncryption;
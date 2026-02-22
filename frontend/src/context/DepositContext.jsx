import { createContext, useContext, useState } from 'react';

const DepositContext = createContext(null);

export function DepositProvider({ children }) {
  const [depositState, setDepositState] = useState({
    requestId: null,
    path: null,          // 'AUTO_APPROVE' | 'OTP_REQUIRED' | 'MANAGER_REQUIRED'
    riskScore: 0,        // 0-100
    riskCodes: [],
    aiExplanation: null,
    changeRequestId: null,
    newBankDetails: null,
    maskedEmail: null,
  });

  const setResult = (data) => setDepositState(prev => ({ ...prev, ...data }));
  const clearDeposit = () => setDepositState({ requestId: null, path: null, riskScore: 0, riskCodes: [], aiExplanation: null, changeRequestId: null, newBankDetails: null, maskedEmail: null });

  return (
    <DepositContext.Provider value={{ depositState, setResult, clearDeposit }}>
      {children}
    </DepositContext.Provider>
  );
}

export const useDeposit = () => useContext(DepositContext);

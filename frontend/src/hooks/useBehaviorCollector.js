import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export function useBehaviorCollector() {
  const location = useLocation();
  const loginTimeRef    = useRef(Date.now());
  const pagesRef        = useRef([]);
  const pageEntryRef    = useRef(Date.now());
  const clipboardRef    = useRef(false);
  const hesitationRef   = useRef({});
  const focusTimesRef   = useRef({});

  // Track page visits
  useEffect(() => {
    const page = location.pathname.replace('/','') || 'root';
    if (!pagesRef.current.includes(page)) pagesRef.current.push(page);
    pageEntryRef.current = Date.now();
  }, [location.pathname]);

  // Register field focus/blur for hesitation timing
  const registerField = useCallback((fieldName, inputRef) => {
    if (!inputRef?.current) return;
    const el = inputRef.current;
    const onFocus = () => { focusTimesRef.current[fieldName] = Date.now(); };
    const onBlur  = () => {
      if (focusTimesRef.current[fieldName]) {
        hesitationRef.current[fieldName] = Date.now() - focusTimesRef.current[fieldName];
      }
    };
    el.addEventListener('focus', onFocus);
    el.addEventListener('blur',  onBlur);
    return () => { el.removeEventListener('focus', onFocus); el.removeEventListener('blur', onBlur); };
  }, []);

  // Register paste detection on a field
  const registerPaste = useCallback((inputRef) => {
    if (!inputRef?.current) return;
    const el = inputRef.current;
    const onPaste = () => { clipboardRef.current = true; };
    el.addEventListener('paste', onPaste);
    return () => el.removeEventListener('paste', onPaste);
  }, []);

  const getBehaviorPayload = useCallback(() => {
    const sessionDurationSeconds = Math.round((Date.now() - loginTimeRef.current) / 1000);
    const timeOnCurrentPage      = Math.round((Date.now() - pageEntryRef.current) / 1000);
    const pages = [...pagesRef.current];
    const depositIdx = pages.indexOf('deposit');
    const directNavigation = depositIdx <= 1; // went to deposit without browsing much

    return {
      sessionDurationSeconds,
      pagesVisitedBeforeDeposit: pages.filter(p => p !== 'deposit' && p !== 'deposit/change'),
      timeOnDepositPageSeconds: timeOnCurrentPage,
      clipboardPaste: clipboardRef.current,
      fieldHesitationMs: hesitationRef.current,
      directNavigation,
      deviceFingerprintHash: btoa(navigator.userAgent + navigator.language + screen.width).slice(0, 32),
    };
  }, []);

  return { getBehaviorPayload, registerField, registerPaste };
}

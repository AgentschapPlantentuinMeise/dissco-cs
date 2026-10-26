import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useLocation, useSearchParams } from 'react-router-dom';
import { CsPage } from '../../components/layout/CsPage';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageBody } from '../../components/layout/PageBody';
import { setPassword as submitSetPassword, checkReset } from '../../api/madoc-auth/auth';
import { getSiteSlug } from '../../api/slug';
import { LuCheck, LuCircle, LuEye, LuEyeOff } from 'react-icons/lu';
import { IconButton } from '../../components/ui/IconButton';
import { inputClass } from '../../components/ui/input-styles';

// Mirrors validatePasswordStrength() in services/madoc-ts/src/routes/dissco-cs-auth.ts -
// this is client-side feedback only, the server call is the real source of truth.
function getPasswordRequirements(password: string) {
  return [
    { key: 'set_password_req_length', met: password.length >= 8 },
    { key: 'set_password_req_uppercase', met: /[A-Z]/.test(password) },
    { key: 'set_password_req_lowercase', met: /[a-z]/.test(password) },
    { key: 'set_password_req_number', met: /[0-9]/.test(password) },
    { key: 'set_password_req_special', met: /[^a-zA-Z0-9]/.test(password) },
  ];
}

export function SetPassword() {
  const { t } = useTranslation('dissco-cs');
  const location = useLocation();
  const isActivation = location.pathname.endsWith('/activate-account');
  const [searchParams] = useSearchParams();
  const c1 = searchParams.get('c1') || '';
  const c2 = searchParams.get('c2') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState('');
  const [linkValid, setLinkValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!c1 || !c2) {
      return;
    }
    checkReset({ c1, c2 })
      .then(res => setLinkValid(res.valid))
      .catch(() => setLinkValid(false));
  }, [c1, c2]);

  const passwordRequirements = getPasswordRequirements(password);
  const passwordValid = passwordRequirements.every(req => req.met);
  const canSubmit = passwordValid && password === confirmPassword && password.length > 0;

  const submit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }

    setStatus('sending');
    try {
      await submitSetPassword({ c1, c2, password });
      const siteRoot = `/s/${getSiteSlug()}/`;
      window.location.href = isActivation ? `${siteRoot}?welcome=1` : siteRoot;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : t('set_password_form_error'));
    }
  };

  if (!c1 || !c2 || linkValid === false) {
    return (
      <CsPage>
        <PageBody width="narrow">
          <PageHeader variant="plain" title={t('set_password_title')} />
          <p className="text-red-700">{t('set_password_invalid_link')}</p>
        </PageBody>
      </CsPage>
    );
  }

  return (
    <CsPage>
      <PageBody width="narrow">
        <PageHeader variant="plain" title={t('set_password_title')} lead={t('set_password_intro')} />

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{t('set_password_form_password')}</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`${inputClass} w-full pr-10`}
              />
              <IconButton
                icon={showPassword ? LuEyeOff : LuEye}
                label={t(showPassword ? 'password_toggle_hide' : 'password_toggle_show')}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              />
            </div>
            {password && (
              <ul className="flex flex-col gap-0.5 mt-1">
                {passwordRequirements.map(req => (
                  <li
                    key={req.key}
                    className={`text-sm flex items-center gap-1.5 ${req.met ? 'text-green-700' : 'text-gray-500'}`}
                  >
                    {req.met ? <LuCheck aria-hidden="true" /> : <LuCircle aria-hidden="true" />} {t(req.key)}
                  </li>
                ))}
              </ul>
            )}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{t('set_password_form_confirm')}</span>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={`${inputClass} w-full pr-10`}
              />
              <IconButton
                icon={showConfirmPassword ? LuEyeOff : LuEye}
                label={t(showConfirmPassword ? 'password_toggle_hide' : 'password_toggle_show')}
                onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              />
            </div>
            {confirmPassword && confirmPassword !== password && (
              <span className="text-sm text-red-700">{t('set_password_error_mismatch')}</span>
            )}
          </label>

          {status === 'error' && <p className="text-red-700">{error}</p>}

          <div>
            <Button
              type="submit"
              disabled={!canSubmit || status === 'sending'}
            >
              {t('set_password_form_submit')}
            </Button>
          </div>
        </form>
      </PageBody>
    </CsPage>
  );
}

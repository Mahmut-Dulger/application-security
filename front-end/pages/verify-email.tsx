import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import classNames from 'classnames';
import { StatusMessage } from '@types';

const VerifyEmailPage: React.FC = () => {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);

  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    // Get token from URL query parameter
    if (router.query.token) {
      setToken(router.query.token as string);
    }
    // Get email from URL query parameter (optional, for context)
    if (router.query.email) {
      setEmail(decodeURIComponent(router.query.email as string));
    }
  }, [router.query]);

  const handleVerifyEmail = async (verificationToken: string) => {
    if (!verificationToken) {
      setStatusMessages([{ message: t('verify.noToken'), type: 'error' }]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/users/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      if (response.ok) {
        setIsVerified(true);
        setStatusMessages([{ message: t('verify.success'), type: 'success' }]);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        const data = await response.json();
        setStatusMessages([{ message: data.message || t('verify.failed'), type: 'error' }]);
        setShowResendForm(true);
      }
    } catch (error) {
      setStatusMessages([{ message: t('general.error'), type: 'error' }]);
      setShowResendForm(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      setStatusMessages([{ message: t('verify.emailRequired'), type: 'error' }]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/users/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStatusMessages([{ message: t('verify.resendSuccess'), type: 'success' }]);
        setShowResendForm(false);
      } else {
        const data = await response.json();
        setStatusMessages([{ message: data.message || t('general.error'), type: 'error' }]);
      }
    } catch (error) {
      setStatusMessages([{ message: t('general.error'), type: 'error' }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If token is available, auto-verify
    if (token && !isVerified) {
      handleVerifyEmail(token);
    }
  }, [token, isVerified]);

  return (
    <div className="max-w-md m-auto my-12">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">{t('verify.title')}</h2>

        {statusMessages.map((message, index) => (
          <div
            key={index}
            className={classNames(
              'mt-4 p-4 rounded',
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            )}
          >
            {message.message}
          </div>
        ))}

        {isLoading && (
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!isVerified && !token && (
          <div className="mt-6">
            <p className="text-center text-gray-600 mb-4">{t('verify.tokenNotFound')}</p>
            <button
              onClick={() => setShowResendForm(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition"
            >
              {t('verify.resendButton')}
            </button>
          </div>
        )}

        {isVerified && (
          <div className="mt-6">
            <p className="text-center text-green-600 mb-4">{t('verify.redirecting')}</p>
          </div>
        )}

        {showResendForm && !isVerified && (
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-4">{t('verify.resendDescription')}</p>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">{t('verify.emailLabel')}</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('verify.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleResendEmail}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition disabled:opacity-50"
            >
              {isLoading ? t('verify.sending') : t('verify.resendButton')}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {t('verify.backToLogin')}{' '}
            <a href="/login" className="text-blue-600 hover:text-blue-800 font-bold">
              {t('verify.loginLink')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService';
import '../../styles/Auth.css';

const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(600); // 10 minutes

  useEffect(() => {
    if (!email) {
      navigate('/register');
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);

    try {
      await authService.verifyOtp({ email, otp: otpString });
      navigate('/complete-profile');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    try {
      // Use the new resendOtp endpoint (Workplan Gap Fix)
      await authService.resendOtp(email);
      setTimer(600); // Reset timer to 10 minutes
      setOtp(['', '', '', '', '', '']); // Clear OTP inputs
      alert('✅ OTP resent successfully! Please check your email.');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to resend OTP';
      setError(errorMsg);
      // If rate limit error, show helpful message
      if (err.response?.status === 429) {
        setError('⏳ Too many attempts. Please wait an hour before requesting another OTP.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Verify Your Email</h1>
          <p>We've sent a 6-digit code to <strong>{email}</strong></p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="otp-container">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="otp-input"
                required
              />
            ))}
          </div>

          <div className="timer">
            {timer > 0 ? (
              <p>Code expires in: <strong>{formatTime(timer)}</strong></p>
            ) : (
              <p className="error-text">Code expired. Please request a new one.</p>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block" 
            disabled={loading || timer === 0}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Didn't receive the code?{' '}
            <button
              onClick={handleResend}
              className="link-button"
              disabled={resendLoading || timer > 540}
            >
              {resendLoading ? 'Sending...' : 'Resend OTP'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtpPage;

import { User } from "@types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const signupUser = (userData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isOrganiser: boolean;
}) => {
  return fetch(`${API_URL}/users/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });
};

const verifyEmail = (token: string) => {
  return fetch(`${API_URL}/users/verify-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });
};

const resendVerificationEmail = (email: string) => {
  return fetch(`${API_URL}/users/resend-verification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
};

const loginUser = (credentials: { email: string; password: string }) => {
  return fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });
};

const verifyMFA = (userId: number, mfaCode: string) => {
  return fetch(`${API_URL}/users/verify-mfa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, mfaCode }),
  });
};

const forgotPassword = (email: string) => {
  return fetch(`${API_URL}/users/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
};

const resetPassword = (token: string, newPassword: string) => {
  return fetch(`${API_URL}/users/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, newPassword }),
  });
};

const changePassword = (currentPassword: string, newPassword: string, token: string) => {
  return fetch(`${API_URL}/users/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
};

const verifyChangePassword = (mfaCode: string, newPassword: string, token: string) => {
  return fetch(`${API_URL}/users/verify-change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mfaCode, newPassword }),
  });
};

const createRememberMeToken = (token: string) => {
  return fetch(`${API_URL}/users/remember-me`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
};

const loginWithToken = (rememberMeToken: string) => {
  return fetch(`${API_URL}/users/login-with-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rememberMeToken }),
  });
};

const logoutUser = (token: string) => {
  return fetch(`${API_URL}/users/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
};

const UserService = {
  signupUser,
  verifyEmail,
  resendVerificationEmail,
  loginUser,
  verifyMFA,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyChangePassword,
  createRememberMeToken,
  loginWithToken,
  logoutUser,
};

export default UserService;

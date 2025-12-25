import classNames from "classnames";
import { useRouter } from "next/router";
import React, { useState } from "react";
import UserService from "@services/UserService";
import { StatusMessage } from "@types";
import { useTranslation } from "next-i18next";

const UserSignupForm: React.FC = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isOrganiser, setIsOrganiser] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong">("weak");

  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);

  const router = useRouter();
  const { t } = useTranslation();

  const validatePassword = (pwd: string) => {
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasLowercase = /[a-z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
    const isLongEnough = pwd.length >= 12;

    const strength = [hasUppercase, hasLowercase, hasNumber, hasSpecial, isLongEnough].filter(Boolean).length;

    if (strength <= 2) return "weak";
    if (strength <= 3) return "medium";
    return "strong";
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordStrength(validatePassword(value));
  };

  const validateEmail = (emailValue: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue || emailValue.trim() === "") {
      setEmailError(t("signup.validate.emailRequired"));
      return false;
    }
    if (!emailRegex.test(emailValue)) {
      setEmailError(t("signup.validate.invalidEmail"));
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validateForm = (): boolean => {
    let result = true;

    // Clear previous errors
    setFirstNameError(null);
    setLastNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    if (!firstName || firstName.trim() === "") {
      setFirstNameError(t("signup.validate.firstNameRequired"));
      result = false;
    }

    if (!lastName || lastName.trim() === "") {
      setLastNameError(t("signup.validate.lastNameRequired"));
      result = false;
    }

    if (!validateEmail(email)) {
      result = false;
    }

    if (!password || password.trim() === "") {
      setPasswordError(t("signup.validate.passwordRequired"));
      result = false;
    } else if (password.length < 12) {
      setPasswordError(t("signup.validate.passwordMinLength"));
      result = false;
    } else if (!/[A-Z]/.test(password)) {
      setPasswordError(t("signup.validate.passwordUppercase"));
      result = false;
    } else if (!/[a-z]/.test(password)) {
      setPasswordError(t("signup.validate.passwordLowercase"));
      result = false;
    } else if (!/\d/.test(password)) {
      setPasswordError(t("signup.validate.passwordNumber"));
      result = false;
    } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setPasswordError(t("signup.validate.passwordSpecial"));
      result = false;
    } else if (password.includes(email.split("@")[0])) {
      setPasswordError(t("signup.validate.passwordEmail"));
      result = false;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError(t("signup.validate.passwordMismatch"));
      result = false;
    }

    return result;
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();

    setStatusMessages([]);

    if (!validateForm()) {
      return;
    }

    try {
      const response = await UserService.signupUser({
        firstName,
        lastName,
        email,
        password,
        isOrganiser,
      });

      if (response.status === 201) {
        setStatusMessages([{ message: t("signup.success"), type: "success" }]);
        // Redirect to email verification page
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        }, 2000);
      } else {
        const data = await response.json();
        setStatusMessages([{ message: data.message || t("general.error"), type: "error" }]);
      }
    } catch (error) {
      setStatusMessages([{ message: t("general.error"), type: "error" }]);
    }
  };

  const passwordStrengthColor = {
    weak: "text-red-600",
    medium: "text-yellow-600",
    strong: "text-green-600",
  };

  return (
    <div className="max-w-md m-auto">
      <div>
        <h3 className="px-0">{t("signup.title")}</h3>

        {statusMessages.map((message, index) => (
          <div
            key={index}
            className={classNames(
              "mt-4 p-3 rounded",
              message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            )}
          >
            {message.message}
          </div>
        ))}

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" htmlFor="firstName">
              {t("signup.firstName")}
            </label>
            <input
              className={classNames(
                "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                firstNameError ? "border-red-500" : "border-gray-300"
              )}
              id="firstName"
              type="text"
              placeholder={t("signup.firstNamePlaceholder")}
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (firstNameError) setFirstNameError(null);
              }}
            />
            {firstNameError && <p className="text-red-500 text-sm mt-1">{firstNameError}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" htmlFor="lastName">
              {t("signup.lastName")}
            </label>
            <input
              className={classNames(
                "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                lastNameError ? "border-red-500" : "border-gray-300"
              )}
              id="lastName"
              type="text"
              placeholder={t("signup.lastNamePlaceholder")}
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (lastNameError) setLastNameError(null);
              }}
            />
            {lastNameError && <p className="text-red-500 text-sm mt-1">{lastNameError}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" htmlFor="email">
              {t("signup.email")}
            </label>
            <input
              className={classNames(
                "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                emailError ? "border-red-500" : "border-gray-300"
              )}
              id="email"
              type="email"
              placeholder={t("signup.emailPlaceholder")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
            />
            {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" htmlFor="password">
              {t("signup.password")}
            </label>
            <input
              className={classNames(
                "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                passwordError ? "border-red-500" : "border-gray-300"
              )}
              id="password"
              type="password"
              placeholder={t("signup.passwordPlaceholder")}
              value={password}
              onChange={(e) => {
                handlePasswordChange(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
            />
            {password && (
              <div className="mt-2">
                <p className={classNames("text-sm", passwordStrengthColor[passwordStrength])}>
                  {t(`signup.passwordStrength.${passwordStrength}`)}
                </p>
                <ul className="text-xs mt-2 space-y-1">
                  <li className={/[A-Z]/.test(password) ? "text-green-600" : "text-gray-400"}>
                    ✓ {t("signup.passwordRequirements.uppercase")}
                  </li>
                  <li className={/[a-z]/.test(password) ? "text-green-600" : "text-gray-400"}>
                    ✓ {t("signup.passwordRequirements.lowercase")}
                  </li>
                  <li className={/\d/.test(password) ? "text-green-600" : "text-gray-400"}>
                    ✓ {t("signup.passwordRequirements.number")}
                  </li>
                  <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "text-green-600" : "text-gray-400"}>
                    ✓ {t("signup.passwordRequirements.special")}
                  </li>
                  <li className={password.length >= 12 ? "text-green-600" : "text-gray-400"}>
                    ✓ {t("signup.passwordRequirements.length")}
                  </li>
                </ul>
              </div>
            )}
            {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" htmlFor="confirmPassword">
              {t("signup.confirmPassword")}
            </label>
            <input
              className={classNames(
                "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                confirmPasswordError ? "border-red-500" : "border-gray-300"
              )}
              id="confirmPassword"
              type="password"
              placeholder={t("signup.confirmPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (confirmPasswordError) setConfirmPasswordError(null);
              }}
            />
            {confirmPasswordError && <p className="text-red-500 text-sm mt-1">{confirmPasswordError}</p>}
          </div>

          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600"
                checked={isOrganiser}
                onChange={(e) => setIsOrganiser(e.target.checked)}
              />
              <span className="ml-2 text-sm">{t("signup.isOrganiser")}</span>
            </label>
          </div>

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition"
            type="submit"
          >
            {t("signup.submit")}
          </button>

          <p className="mt-4 text-center text-sm">
            {t("signup.alreadyHaveAccount")}{" "}
            <a href="/login" className="text-blue-600 hover:text-blue-800 font-bold">
              {t("signup.login")}
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default UserSignupForm;
